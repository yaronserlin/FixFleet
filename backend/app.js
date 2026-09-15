// app.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const { verifyToken } = require('./middleware/authMiddleware');
const { errorHandler } = require('./middleware/errorMiddleware');

// Model imports for tenant-aware media access
const Equipment = require('./models/Equipment');
const Fault = require('./models/Fault');
const User = require('./models/User');

// Route imports
const authRoutes = require('./routes/authRoutes');
const equipmentRoutes = require('./routes/equipmentRoutes');
const toolRoutes = require('./routes/toolRoutes');
const faultRoutes = require('./routes/faultRoutes');
const maintenanceRoutes = require('./routes/maintenanceRoutes');
const partRoutes = require('./routes/partRoutes');
const adminRoutes = require('./routes/adminRoutes');
const logger = require('./utils/logger');

const app = express();

// Trust reverse proxy headers (e.g. Render load balancer / X-Forwarded-For for express-rate-limit)
app.set('trust proxy', 1);

// Connect Database if not already connected (e.g., in testing)
if (process.env.NODE_ENV !== 'test') {
    connectDB();
}

const isProd = process.env.NODE_ENV === 'production';
const devOrigins = isProd ? [] : ['http://localhost:5173', 'http://localhost:4173'];

// Parse allowed frontend origins from environment (supports comma-separated list and removes trailing slashes)
const configuredOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map(url => url.trim().replace(/\/+$/, ''))
    .filter(Boolean);

const allowedOrigins = configuredOrigins.length > 0 
    ? configuredOrigins 
    : ['http://localhost:5173'];

// Security headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            'frame-ancestors': ["'self'", ...devOrigins, ...allowedOrigins],
        },
    },
}));

// CORS locked to configured frontend origins
app.use(cors({
    origin: (origin, callback) => {
        const normalizedOrigin = origin ? origin.replace(/\/+$/, '') : null;
        // Allow requests with no origin (like mobile apps, curl, postman) or matching origin
        if (!origin || allowedOrigins.includes(normalizedOrigin) || devOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));

// Middleware
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// HTTP Request Logger
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.http(`${req.method} ${req.originalUrl || req.url} ${res.statusCode} (${duration}ms)`);
    });
    next();
});

// Uploads - Protected multi-tenant media delivery
const uploadsDir = path.join(__dirname, 'uploads');
app.get('/uploads/:filename', verifyToken, async (req, res, next) => {
    try {
        const rawFilename = req.params.filename;
        const filename = path.basename(rawFilename);
        const filePath = path.join(uploadsDir, filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'Media file not found' });
        }

        const safePattern = new RegExp(filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

        // Check if resource belongs to the requesting user's company
        const [ownsEquipmentBook, ownsFaultPhoto, ownsUserAvatar] = await Promise.all([
            Equipment.exists({ companyId: req.user.companyId, 'books.fileUrl': safePattern }),
            Fault.exists({ companyId: req.user.companyId, photos: safePattern }),
            User.exists({ companyId: req.user.companyId, avatar: safePattern }),
        ]);

        if (ownsEquipmentBook || ownsFaultPhoto || ownsUserAvatar) {
            return res.sendFile(filePath);
        }

        // Check if resource belongs to another company
        const [otherEquipmentBook, otherFaultPhoto, otherUserAvatar] = await Promise.all([
            Equipment.exists({ companyId: { $ne: req.user.companyId }, 'books.fileUrl': safePattern }),
            Fault.exists({ companyId: { $ne: req.user.companyId }, photos: safePattern }),
            User.exists({ companyId: { $ne: req.user.companyId }, avatar: safePattern }),
        ]);

        if (otherEquipmentBook || otherFaultPhoto || otherUserAvatar) {
            return res.status(403).json({ message: 'Forbidden: Cannot access media belonging to another organization' });
        }

        // Fallback for unassigned or general media
        res.sendFile(filePath);
    } catch (err) {
        next(err);
    }
});

// Health check endpoints (accessible at both /health and /api/health for cloud monitors like Render)
const healthCheck = (req, res) => {
    const isDbConnected = mongoose.connection.readyState === 1;
    res.status(isDbConnected ? 200 : 503).json({
        status: isDbConnected ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        database: isDbConnected ? 'connected' : 'disconnected',
    });
};
app.get('/health', healthCheck);
app.get('/api/health', healthCheck);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/tools', toolRoutes);
app.use('/api/faults', faultRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/parts', partRoutes);
app.use('/api/admin', adminRoutes);

// Global error handler (Finding #7 Fix: log error, proper 500 response, no swallowed errors)
app.use(errorHandler);

if (require.main === module) {
    const PORT = process.env.PORT || 5001;
    app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
}

module.exports = app;