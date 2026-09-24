// constants/rateLimits.js

/**
 * Rate limit configuration applied to the public authentication endpoints
 * (register/login/refresh) in routes/authRoutes.js. Skipped entirely in
 * the test environment (see the route's `skip` option).
 *
 * @type {{ windowMs: number, max: number }}
 */
const AUTH_RATE_LIMIT = Object.freeze({
    /** Rolling window size, in milliseconds (15 minutes). */
    windowMs: 15 * 60 * 1000,
    /** Maximum requests allowed per IP within the window. */
    max: 20,
});

/**
 * Baseline limiter applied to every API route, not just auth: generous
 * enough for a busy SPA session (which fires bursts of reads per screen)
 * but caps scripted hammering of the data and upload endpoints.
 * @type {{ windowMs: number, max: number }}
 */
const GENERAL_RATE_LIMIT = Object.freeze({
    windowMs: 15 * 60 * 1000,
    max: 500,
});

module.exports = { AUTH_RATE_LIMIT, GENERAL_RATE_LIMIT };
