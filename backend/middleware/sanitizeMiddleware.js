// middleware/sanitizeMiddleware.js

/**
 * Recursively strips any object key that starts with `$` or contains `.`
 * from the given value, mutating plain objects and arrays in place.
 *
 * This exists as defense-in-depth against NoSQL/MongoDB operator injection
 * (e.g. `{ "$gt": "" }` or `{ "email.$ne": null }` smuggled into JSON or
 * query-string input). Mongoose 8's built-in `sanitizeFilter` already
 * guards query construction, but this middleware ensures a malicious key
 * never even reaches a controller or service in the first place.
 *
 * Mutates in place (rather than returning a replacement) so it is safe to
 * use on properties like Express 5's `req.query`, which may not be
 * reassignable.
 *
 * @param {*} value - The value to sanitize. Non-object/array values are returned unchanged.
 * @returns {*} The same value, mutated in place if it was a plain object or array.
 */
function sanitizeInPlace(value) {
    if (Array.isArray(value)) {
        for (const item of value) {
            sanitizeInPlace(item);
        }
        return value;
    }

    if (value && typeof value === 'object') {
        for (const key of Object.keys(value)) {
            if (key.startsWith('$') || key.includes('.')) {
                delete value[key];
                continue;
            }
            sanitizeInPlace(value[key]);
        }
    }

    return value;
}

/**
 * Express middleware that recursively sanitizes `req.body`, `req.query`,
 * and `req.params` in place, removing any key starting with `$` or
 * containing `.` before the request reaches route handlers/controllers.
 *
 * Intended to be mounted globally, immediately after the body parsers, so
 * every request is covered regardless of route.
 *
 * @param {import('express').Request} req - Express request object; `body`, `query`, and `params` are sanitized in place.
 * @param {import('express').Response} res - Express response object (unused).
 * @param {import('express').NextFunction} next - Express next function, always called.
 * @returns {void}
 */
function sanitizeRequest(req, res, next) {
    if (req.body) sanitizeInPlace(req.body);
    if (req.query) sanitizeInPlace(req.query);
    if (req.params) sanitizeInPlace(req.params);
    next();
}

module.exports = { sanitizeRequest, sanitizeInPlace };
