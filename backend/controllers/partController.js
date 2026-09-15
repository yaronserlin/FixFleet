// controllers/partController.js
const partService = require('../services/partService');

/**
 * GET /api/parts - Lists parts for the requesting user's company.
 * @param {import('express').Request} req - Express request; uses `req.user.companyId` and `req.query.page`/`req.query.limit`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.getAllParts = async (req, res, next) => {
    try {
        const result = await partService.getAllParts(req.user.companyId, req.query);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/parts - Creates a part for the requesting user's company.
 * @param {import('express').Request} req - Express request; uses `req.user.companyId` and `req.body`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.createPart = async (req, res, next) => {
    try {
        const part = await partService.createPart(req.user.companyId, req.body);
        res.status(201).json(part);
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/parts/:id - Updates a part belonging to the requesting user's company.
 * @param {import('express').Request} req - Express request; uses `req.user.companyId`, `req.params.id`, and `req.body`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.updatePart = async (req, res, next) => {
    try {
        const part = await partService.updatePart(req.user.companyId, req.params.id, req.body);
        res.json(part);
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /api/parts/:id - Deletes a part belonging to the requesting user's company.
 * @param {import('express').Request} req - Express request; uses `req.user.companyId` and `req.params.id`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.deletePart = async (req, res, next) => {
    try {
        await partService.deletePart(req.user.companyId, req.params.id);
        res.json({ message: 'Part deleted successfully' });
    } catch (err) {
        next(err);
    }
};
