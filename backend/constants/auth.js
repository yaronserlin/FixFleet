// constants/auth.js

/**
 * Lifetime of a signed JWT access token, as a jsonwebtoken `expiresIn` string.
 * @type {string}
 */
const ACCESS_TOKEN_EXPIRY = '15m';

/**
 * Lifetime of a signed JWT refresh token, as a jsonwebtoken `expiresIn` string.
 * @type {string}
 */
const REFRESH_TOKEN_EXPIRY = '7d';

/**
 * Max-age, in milliseconds, for the access-token cookie. Kept in sync with
 * {@link ACCESS_TOKEN_EXPIRY} (15 minutes).
 * @type {number}
 */
const ACCESS_COOKIE_MAX_AGE = 15 * 60 * 1000;

/**
 * Max-age, in milliseconds, for the refresh-token cookie. Kept in sync with
 * {@link REFRESH_TOKEN_EXPIRY} (7 days).
 * @type {number}
 */
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

/**
 * Number of bcrypt salt rounds used when hashing user passwords.
 * @type {number}
 */
const BCRYPT_SALT_ROUNDS = 10;

module.exports = {
    ACCESS_TOKEN_EXPIRY,
    REFRESH_TOKEN_EXPIRY,
    ACCESS_COOKIE_MAX_AGE,
    REFRESH_COOKIE_MAX_AGE,
    BCRYPT_SALT_ROUNDS,
};
