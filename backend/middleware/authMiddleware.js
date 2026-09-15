// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ROLES, MECHANIC_OR_ADMIN_ROLES } = require('../constants/roles');

/**
 * Authenticates the request: extracts a JWT access token from the `token`
 * or `accessToken` cookie (or an `Authorization: Bearer <token>` header),
 * verifies it, loads the corresponding user (with their company
 * populated), and attaches a plain `req.user` summary for downstream
 * middleware/controllers.
 *
 * Also enforces the first-login forced-password-change gate: if
 * `user.mustChangePassword` is true, every route is blocked with a 403
 * except `POST /auth/me/change-password`, `POST /auth/logout`, and
 * `GET /auth/me`.
 *
 * @param {import('express').Request} req - Express request. On success, sets `req.user = { userId, _id, name, email, role, companyId, company, mustChangePassword }`.
 * @param {import('express').Response} res - Express response. Responds directly (401/403) on any authentication failure rather than calling `next(err)`.
 * @param {import('express').NextFunction} next - Called only once the token is verified, the user/company are valid and active, and the password-change gate (if any) is satisfied.
 * @returns {Promise<void>}
 */
exports.verifyToken = async (req, res, next) => {
    let token = null;

    if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    } else if (req.cookies && req.cookies.accessToken) {
        token = req.cookies.accessToken;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
        const user = await User.findById(decoded.userId).populate('companyId');

        if (!user) {
            return res.status(401).json({ message: 'User not found or deleted' });
        }

        if (!user.companyId || !user.companyId.isActive) {
            return res.status(403).json({ message: 'Company account is inactive or not found' });
        }

        req.user = {
            userId: user._id.toString(),
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            companyId: user.companyId._id,
            company: user.companyId,
            mustChangePassword: Boolean(user.mustChangePassword),
        };

        if (user.mustChangePassword) {
            const rawPath = req.originalUrl || req.url || '';
            const pathWithoutQuery = rawPath.split('?')[0];
            const isPasswordChangeAllowed =
                pathWithoutQuery.endsWith('/auth/me/change-password') ||
                pathWithoutQuery.endsWith('/auth/logout') ||
                (pathWithoutQuery.endsWith('/auth/me') && req.method === 'GET');

            if (!isPasswordChangeAllowed) {
                return res.status(403).json({
                    message: 'Password change required before accessing system resources',
                    code: 'PASSWORD_CHANGE_REQUIRED',
                    mustChangePassword: true,
                });
            }
        }

        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
        }
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

/**
 * Route guard: only allows requests from a user whose role is `admin`.
 * Must run after {@link exports.verifyToken} (reads `req.user`).
 *
 * @param {import('express').Request} req - Express request; reads `req.user.role`.
 * @param {import('express').Response} res - Express response; responds 403 directly if the check fails.
 * @param {import('express').NextFunction} next - Called if the user is an admin.
 * @returns {void}
 */
exports.ensureAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== ROLES.ADMIN) {
        return res.status(403).json({ message: 'Forbidden: Admins only' });
    }
    next();
};

/**
 * Route guard: only allows requests from a user whose role is `mechanic`
 * or `admin`. Must run after {@link exports.verifyToken} (reads `req.user`).
 *
 * @param {import('express').Request} req - Express request; reads `req.user.role`.
 * @param {import('express').Response} res - Express response; responds 403 directly if the check fails.
 * @param {import('express').NextFunction} next - Called if the user is a mechanic or admin.
 * @returns {void}
 */
exports.ensureMechanicOrAdmin = (req, res, next) => {
    if (!req.user || !MECHANIC_OR_ADMIN_ROLES.includes(req.user.role)) {
        return res.status(403).json({ message: 'Forbidden: Mechanics or Admins only' });
    }
    next();
};