// middleware/validationMiddleware.js
const mongoose = require('mongoose');

/**
 * Creates route middleware that rejects the request with 400 unless every
 * named `req.params` entry is present and a syntactically valid Mongoose
 * ObjectId. Runs before any DB lookup, so an invalid id never reaches a
 * controller/service (where it would otherwise surface as a Mongoose
 * CastError).
 *
 * @param {...string} paramNames - Names of `req.params` keys to validate. Defaults to `['id']` if none are given.
 * @returns {import('express').RequestHandler} Middleware that calls `next()` if all named params are valid ObjectIds, otherwise responds 400 directly.
 */
exports.validateObjectId = (...paramNames) => {
    const params = paramNames.length > 0 ? paramNames : ['id'];
    return (req, res, next) => {
        for (const param of params) {
            const id = req.params[param];
            if (!id || !mongoose.isValidObjectId(id)) {
                return res.status(400).json({ message: `Invalid ${param} format` });
            }
        }
        next();
    };
};
