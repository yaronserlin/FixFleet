// app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const { verifyToken } = require('./middleware/authMiddleware');
const { errorHandler } = require('./middleware/errorMiddleware');
const { sanitizeRequest } = require('./middleware/sanitizeMiddleware');
const mediaStorage = require('./utils/mediaStorage');

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
const notificationRoutes = require('./routes/notificationRoutes');
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

// NoSQL injection defense-in-depth: strip any `$`-prefixed or dotted key
// from user-controlled input before it reaches route handlers.
app.use(sanitizeRequest);

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
//
// `:filename` is a GridFS file id (see utils/mediaStorage.js), kept under
// this historical route/param name so every already-stored `/uploads/<id>`
// reference (Fault.photos, Equipment.books[].fileUrl, User.avatar) and every
// frontend caller of that URL keeps working unchanged.
app.get('/uploads/:filename', verifyToken, async (req, res, next) => {
    try {
        const id = req.params.filename;
        const fileInfo = await mediaStorage.getFileInfo(id);

        if (!fileInfo) {
            return res.status(404).json({ message: 'Media file not found' });
        }

        const safePattern = new RegExp(id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

        const serve = () => {
            res.set('Content-Type', fileInfo.contentType || 'application/octet-stream');
            res.set('Content-Length', fileInfo.length);
            mediaStorage.openDownloadStream(id).on('error', next).pipe(res);
        };

        // Check if resource belongs to the requesting user's company
        const [ownsEquipmentBook, ownsFaultPhoto, ownsUserAvatar] = await Promise.all([
            Equipment.exists({ companyId: req.user.companyId, 'books.fileUrl': safePattern }),
            Fault.exists({ companyId: req.user.companyId, photos: safePattern }),
            User.exists({ companyId: req.user.companyId, avatar: safePattern }),
        ]);

        if (ownsEquipmentBook || ownsFaultPhoto || ownsUserAvatar) {
            return serve();
        }

        // Check if resource belongs to another company. mongoose.trusted():
        // this `$ne` is built from the authenticated user's own companyId,
        // not request input, but the global `sanitizeFilter` (config/db.js)
        // can't tell that -- left untrusted it rewrites `{ $ne: ... }` into
        // `{ $eq: { $ne: ... } }`, which fails to cast (same bug fixed in
        // services/notificationService.js).
        const [otherEquipmentBook, otherFaultPhoto, otherUserAvatar] = await Promise.all([
            Equipment.exists({ companyId: mongoose.trusted({ $ne: req.user.companyId }), 'books.fileUrl': safePattern }),
            Fault.exists({ companyId: mongoose.trusted({ $ne: req.user.companyId }), photos: safePattern }),
            User.exists({ companyId: mongoose.trusted({ $ne: req.user.companyId }), avatar: safePattern }),
        ]);

        if (otherEquipmentBook || otherFaultPhoto || otherUserAvatar) {
            return res.status(403).json({ message: 'Forbidden: Cannot access media belonging to another organization' });
        }

        // Fallback for unassigned or general media
        serve();
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
app.use('/api/notifications', notificationRoutes);

// Global error handler (Finding #7 Fix: log error, proper 500 response, no swallowed errors)
app.use(errorHandler);

if (require.main === module) {
    const PORT = process.env.PORT || 5001;
    app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
}

module.exports = app;