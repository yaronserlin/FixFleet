// controllers/authController.js
const authService = require('../services/authService');
const { REFRESH_COOKIE_MAX_AGE, ACCESS_COOKIE_MAX_AGE } = require('../constants/auth');

/**
 * Builds the options object for an auth cookie.
 *
 * `domain` is only set when `COOKIE_DOMAIN` is configured (e.g.
 * `.example.com`) -- for a deployment where the frontend and API are on
 * different subdomains of the same registrable domain (`app.example.com`
 * + `api.example.com`), this is what makes the cookie a shared, first-party
 * cookie across both rather than host-only to the API subdomain alone.
 * Left unset, cookies stay host-only (unchanged default behavior) --
 * correct for local dev and for a same-origin reverse-proxy deployment,
 * where no cross-subdomain sharing is needed in the first place.
 *
 * @param {number} maxAge - Cookie lifetime in milliseconds.
 * @param {string} [path='/'] - Cookie path scope.
 * @returns {import('express').CookieOptions}
 */
const getCookieOptions = (maxAge, path = '/') => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
    maxAge,
    path,
});

/**
 * Sets the `token`, `accessToken`, and `refreshToken` auth cookies on a response.
 * @param {import('express').Response} res - Express response.
 * @param {string} accessToken - Signed JWT access token.
 * @param {string} refreshToken - Signed JWT refresh token.
 * @returns {void}
 */
const setAuthCookies = (res, accessToken, refreshToken) => {
    res.cookie('token', accessToken, getCookieOptions(ACCESS_COOKIE_MAX_AGE, '/'));
    res.cookie('accessToken', accessToken, getCookieOptions(ACCESS_COOKIE_MAX_AGE, '/'));
    res.cookie('refreshToken', refreshToken, getCookieOptions(REFRESH_COOKIE_MAX_AGE, '/api/auth'));
};

/**
 * Clears the `token`, `accessToken`, and `refreshToken` auth cookies on a response.
 * @param {import('express').Response} res - Express response.
 * @returns {void}
 */
const clearAuthCookies = (res) => {
    res.clearCookie('token', getCookieOptions(0, '/'));
    res.clearCookie('accessToken', getCookieOptions(0, '/'));
    res.clearCookie('refreshToken', getCookieOptions(0, '/api/auth'));
};

/**
 * POST /api/auth/register - Company self-service signup (creates Company + first Admin User).
 * @param {import('express').Request} req - Express request; uses `req.body`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.register = async (req, res, next) => {
    try {
        const { user, tokens } = await authService.register(req.body);
        setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

        res.status(201).json({
            message: 'Company and admin account created successfully',
            accessToken: tokens.accessToken,
            token: tokens.token,
            refreshToken: tokens.refreshToken,
            user,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/auth/login - Authenticates a user by email/password.
 * @param {import('express').Request} req - Express request; uses `req.body`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.login = async (req, res, next) => {
    try {
        const { user, tokens } = await authService.login(req.body);
        setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

        res.json({
            accessToken: tokens.accessToken,
            token: tokens.token,
            refreshToken: tokens.refreshToken,
            user,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/auth/refresh - Rotates a refresh token (with reuse detection).
 * @param {import('express').Request} req - Express request; reads the refresh token from `req.cookies.refreshToken` or `req.body.refreshToken`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.refreshToken = async (req, res, next) => {
    try {
        const rawRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
        const { tokens } = await authService.rotateRefreshToken(rawRefreshToken);
        setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

        res.json({
            accessToken: tokens.accessToken,
            token: tokens.token,
            refreshToken: tokens.refreshToken,
        });
    } catch (err) {
        // A detected token-reuse attack revokes the whole session family; also
        // clear the client's now-invalid cookies before propagating the error.
        if (err.code === 'TOKEN_REUSE_DETECTED') {
            clearAuthCookies(res);
        }
        next(err);
    }
};

/**
 * POST /api/auth/logout - Revokes the current refresh token (if any) and clears auth cookies.
 * @param {import('express').Request} req - Express request; reads the refresh token from `req.cookies.refreshToken` or `req.body.refreshToken`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.logout = async (req, res, next) => {
    try {
        const rawRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
        await authService.logout(rawRefreshToken);
        clearAuthCookies(res);
        res.json({ message: 'Logged out successfully' });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/auth/me - Returns the authenticated user's profile.
 * @param {import('express').Request} req - Express request; uses `req.user.userId`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.me = async (req, res, next) => {
    try {
        const profile = await authService.getProfile(req.user.userId);
        res.json(profile);
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/auth/me - Updates the authenticated user's name/email.
 * @param {import('express').Request} req - Express request; uses `req.user.userId` and `req.body`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.updateProfile = async (req, res, next) => {
    try {
        const profile = await authService.updateProfile(req.user.userId, req.body);
        res.json(profile);
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/auth/me/avatar - Uploads/sets the authenticated user's avatar image.
 * @param {import('express').Request} req - Express request; uses `req.user.userId` and `req.file`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.uploadAvatar = async (req, res, next) => {
    try {
        const profile = await authService.uploadAvatar(req.user.userId, req.file);
        res.json(profile);
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/auth/me/change-password - Changes the authenticated user's password.
 * @param {import('express').Request} req - Express request; uses `req.user.userId` and `req.body`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.changePassword = async (req, res, next) => {
    try {
        const result = await authService.changePassword(req.user.userId, req.body);
        res.json({ message: 'Password changed successfully', ...result });
    } catch (err) {
        next(err);
    }
};
