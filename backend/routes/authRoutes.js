// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
    register,
    login,
    refreshToken,
    logout,
    me,
    updateProfile,
    deleteAccount,
    uploadAvatar,
    changePassword,
    forgotPassword,
    resetPassword,
    verifyEmail,
    resendVerification,
} = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { AUTH_RATE_LIMIT, PASSWORD_RESET_RATE_LIMIT } = require('../constants/rateLimits');

const authLimiter = rateLimit({
    ...AUTH_RATE_LIMIT,
    message: { message: 'Too many attempts from this IP, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
});

// Keyed by the requested email (not IP), so one inbox can't be flooded.
const passwordResetLimiter = rateLimit({
    ...PASSWORD_RESET_RATE_LIMIT,
    keyGenerator: (req) => String(req.body?.email || '').trim().toLowerCase(),
    message: { message: 'Too many reset requests for this email, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
});

// Public routes with rate limiting
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/refresh', authLimiter, refreshToken);
router.post('/forgot-password', authLimiter, passwordResetLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);
router.post('/verify-email', authLimiter, verifyEmail);
router.post('/resend-verification', authLimiter, passwordResetLimiter, resendVerification);
router.post('/logout', logout);

// Protected routes
router.get('/me', verifyToken, me);
router.put('/me', verifyToken, updateProfile);
router.delete('/me', verifyToken, deleteAccount);
router.post('/me/avatar', verifyToken, upload.single('avatar'), uploadAvatar);
router.post('/me/change-password', verifyToken, changePassword);

module.exports = router;