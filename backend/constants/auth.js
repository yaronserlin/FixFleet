// constants/auth.js

/**
 * Lifetime of a signed JWT access token, as a jsonwebtoken `expiresIn` string.
 *
 * Deliberately not shorter than this: every expiry requires a successful
 * silent refresh (POST /auth/refresh, which depends on the refresh-token
 * cookie actually reaching the server). In a PWA -- especially one whose
 * frontend and API are on different domains in production, making the
 * refresh cookie a third-party cookie -- that request is meaningfully more
 * likely to fail (browser third-party-cookie restrictions, a backgrounded/
 * suspended app missing its refresh window, flaky mobile connectivity) than
 * in a same-origin desktop browser tab. A longer access-token lifetime
 * means fewer refresh attempts overall, so fewer chances for any one of
 * them to be the unlucky one that fails and force-logs the user out.
 * @type {string}
 */
const ACCESS_TOKEN_EXPIRY = '60m';

/**
 * Lifetime of a signed JWT refresh token, as a jsonwebtoken `expiresIn` string.
 * @type {string}
 */
const REFRESH_TOKEN_EXPIRY = '7d';

/**
 * Max-age, in milliseconds, for the refresh-token cookie. Kept in sync with
 * {@link REFRESH_TOKEN_EXPIRY} (7 days).
 * @type {number}
 */
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

/**
 * Version of the legal documents (frontend/src/content/legalDocuments.js)
 * recorded when a user accepts them at signup. Must match the `version` of the
 * terms and privacy documents there -- __tests__/termsVersion.test.js fails if they drift.
 * @type {string}
 */
const CURRENT_TERMS_VERSION = '1.3';

/**
 * Number of bcrypt salt rounds used when hashing user passwords.
 * @type {number}
 */
const BCRYPT_SALT_ROUNDS = 10;

/**
 * Grace window, in milliseconds, during which presenting an already-rotated
 * refresh token is tolerated as a likely concurrent-request race (e.g.
 * multiple browser tabs whose access tokens happen to expire at the same
 * moment, each independently triggering a refresh) rather than treated as
 * reuse of a stolen token. Reuse detection still fires for a token revoked
 * *longer* ago than this -- see `services/authService.js` `rotateRefreshToken`.
 * @type {number}
 */
const REFRESH_REUSE_GRACE_MS = 30 * 1000;

/**
 * Lifetime, in milliseconds, of a forgot-password reset link (30 minutes).
 * @type {number}
 */
const PASSWORD_RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

/**
 * Lifetime, in milliseconds, of a signup email-verification link (24 hours).
 * @type {number}
 */
const EMAIL_VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

module.exports = {
    ACCESS_TOKEN_EXPIRY,
    REFRESH_TOKEN_EXPIRY,
    REFRESH_COOKIE_MAX_AGE,
    BCRYPT_SALT_ROUNDS,
    CURRENT_TERMS_VERSION,
    REFRESH_REUSE_GRACE_MS,
    PASSWORD_RESET_TOKEN_TTL_MS,
    EMAIL_VERIFY_TOKEN_TTL_MS,
};
