// controllers/authController.js
const authService = require('../services/authService');
const { REFRESH_COOKIE_MAX_AGE } = require('../constants/auth');

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
    // 'none' is only needed (and only safe to need) for the one deployment
    // shape where the SPA and the API live on different subdomains and the
    // browser treats their XHR as third-party (e.g. Safari ITP) -- that is
    // exactly the case COOKIE_DOMAIN exists for. Everywhere else 'lax'
    // keeps the refresh cookie off cross-site requests entirely, which is
    // the whole point: cookie-auth is no longer accepted for the API (see
    // authMiddleware), so a cross-site request can no longer ride these
    // cookies into a state-changing call.
    sameSite: process.env.NODE_ENV === 'production' && process.env.COOKIE_DOMAIN ? 'none' : 'lax',
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
    maxAge,
    path,
});

/**
 * Sets the `refreshToken` auth cookie on a response. This is now the ONLY
 * auth cookie: access tokens travel in the `Authorization: Bearer` header
 * (the SPA keeps them in memory/localStorage), so no cookie can ever
 * authenticate a state-changing API request -- closing the CSRF gap that
 * cookie-based access auth with SameSite=None used to open. The refresh
 * cookie stays path-scoped to /api/auth, so the only route a browser ever
 * attaches it to is the refresh/logout flow itself.
 * @param {import('express').Response} res - Express response.
 * @param {string} refreshToken - Signed JWT refresh token.
 * @returns {void}
 */
const setRefreshCookie = (res, refreshToken) => {
    res.cookie('refreshToken', refreshToken, getCookieOptions(REFRESH_COOKIE_MAX_AGE, '/api/auth'));
};

/**
 * Clears the `refreshToken` cookie, plus the legacy `token`/`accessToken`
 * cookies so clients migrated from cookie-based access auth are cleaned up.
 * @param {import('express').Response} res - Express response.
 * @returns {void}
 */
const clearAuthCookies = (res) => {
    res.clearCookie('refreshToken', getCookieOptions(0, '/api/auth'));
    // Legacy cookie names, removed from responses but possibly still stored
    // by older clients -- clear them on every flow that resets auth state.
    res.clearCookie('token', getCookieOptions(0, '/'));
    res.clearCookie('accessToken', getCookieOptions(0, '/'));
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
        setRefreshCookie(res, tokens.refreshToken);

        // The refresh token is deliberately NOT returned in the body: it is
        // an HTTP-only cookie so client JS never has a reason to store it.
        res.status(201).json({
            message: 'Company and admin account created successfully',
            accessToken: tokens.accessToken,
            token: tokens.token,
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
        setRefreshCookie(res, tokens.refreshToken);

        // The refresh token is deliberately NOT returned in the body: it is
        // an HTTP-only cookie so client JS never has a reason to store it.
        res.json({
            accessToken: tokens.accessToken,
            token: tokens.token,
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
        setRefreshCookie(res, tokens.refreshToken);

        // Refresh token goes back out as an HTTP-only cookie only, never in
        // the body.
        res.json({
            accessToken: tokens.accessToken,
            token: tokens.token,
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

exports.deleteAccount = async (req, res, next) => {
    try {
        await authService.deleteAccount(req.user.userId, req.body?.confirmation);
        clearAuthCookies(res);
        res.json({ message: 'Account deleted successfully' });
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
