// middleware/errorMiddleware.js
const logger = require('../utils/logger');

/**
 * Centralized Express error-handling middleware. Must be mounted last (after
 * all routes) so that every `next(err)` call in the app funnels through here.
 *
 * Maps known error types to appropriate HTTP status codes and safe JSON
 * bodies, and falls back to a generic 500 (with the real message only in
 * non-production environments) for anything unrecognized. All branches log
 * via `utils/logger` so nothing fails silently.
 *
 * The fallback branch also handles errors thrown by the service layer via
 * `utils/httpError.js`: an expected, client-facing error (`err.status` in
 * the 4xx range) is logged at `warn` level and echoes `err.code` in the
 * response body when the throwing service set one (e.g.
 * `TOKEN_REUSE_DETECTED`); anything else is treated as a genuine
 * server-side fault and logged at `error` level as before.
 *
 * @param {Error} err - The error passed to `next(err)`.
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next function (unused, required for Express to recognize this as an error handler).
 * @returns {void}
 */
function errorHandler(err, req, res, next) {
    // Syntax error from bad JSON payload
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        logger.warn(`JSON syntax error: ${err.message}`);
        return res.status(400).json({ message: 'Invalid JSON payload' });
    }

    // Mongoose validation errors
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(e => e.message);
        logger.warn(`Validation error: ${messages.join(', ')}`);
        return res.status(400).json({ message: messages.join(', ') });
    }

    // Mongoose cast errors (invalid ObjectId)
    if (err.name === 'CastError') {
        logger.warn(`Cast error on field ${err.path}: ${err.value}`);
        return res.status(400).json({ message: `Invalid ${err.path}: ${err.value}` });
    }

    // Multer file upload errors
    if (err.name === 'MulterError') {
        logger.warn(`Multer upload error: ${err.message}`);
        return res.status(400).json({ message: err.message });
    }

    // CORS errors
    if (err.message === 'Not allowed by CORS') {
        logger.warn(`CORS blocked request from origin: ${req.headers.origin}`);
        return res.status(403).json({ message: 'CORS forbidden' });
    }

    const status = err.status || 500;
    const isExpectedClientError = status >= 400 && status < 500;

    if (isExpectedClientError) {
        // A service threw via utils/httpError.js to signal an expected,
        // user-facing failure (validation, not-found, forbidden, etc.) --
        // this is normal control flow, not a bug, so it's only a warning.
        logger.warn(`Request error (${status}): ${err.message}`);
    } else {
        // Server-side logging of unexpected errors
        logger.error('Unhandled server error:', err);
    }

    const isProduction = process.env.NODE_ENV === 'production';
    res.status(status).json({
        message: isProduction && !isExpectedClientError ? 'Server error' : (err.message || 'Server error'),
        ...(err.code ? { code: err.code } : {}),
    });
}

module.exports = { errorHandler };
