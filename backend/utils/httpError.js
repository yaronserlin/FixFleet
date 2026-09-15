// utils/httpError.js

/**
 * Creates a plain `Error` annotated with an HTTP status code, meant to be
 * thrown from a service function and caught by a controller's `next(err)`.
 * The centralized error handler (middleware/errorMiddleware.js) reads
 * `err.status` and `err.message` to shape the JSON response, so this is
 * the standard way for the service layer to signal an expected,
 * user-facing failure (validation error, not-found, forbidden, etc.)
 * without depending on `req`/`res`.
 *
 * @param {number} status - HTTP status code to respond with (e.g. 400, 404, 403).
 * @param {string} message - Human-readable message sent back to the client.
 * @returns {Error & { status: number }} An Error instance with a `status` property set.
 */
function httpError(status, message) {
    const err = new Error(message);
    err.status = status;
    return err;
}

module.exports = { httpError };
