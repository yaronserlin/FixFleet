// utils/httpError.js

/**
 * Creates a plain `Error` annotated with an HTTP status code, meant to be
 * thrown from a service function and caught by a controller's `next(err)`.
 * The centralized error handler (middleware/errorMiddleware.js) reads
 * `err.status` and `err.message` to shape the JSON response (and echoes
 * `err.code` when set, for machine-readable error codes like
 * `TOKEN_REUSE_DETECTED`), so this is the standard way for the service
 * layer to signal an expected, user-facing failure (validation error,
 * not-found, forbidden, etc.) without depending on `req`/`res`.
 *
 * @param {number} status - HTTP status code to respond with (e.g. 400, 404, 403).
 * @param {string} message - Human-readable message sent back to the client.
 * @param {{ code?: string }} [extra] - Additional properties to attach to the error, e.g. a machine-readable `code`.
 * @returns {Error & { status: number, code?: string }} An Error instance with `status` (and optionally `code`) set.
 */
function httpError(status, message, extra) {
    const err = new Error(message);
    err.status = status;
    if (extra && typeof extra === 'object') {
        Object.assign(err, extra);
    }
    return err;
}

module.exports = { httpError };
