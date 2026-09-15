// controllers/faultController.js
const faultService = require('../services/faultService');

/**
 * GET /api/faults - Lists faults for the requesting user's company.
 * @param {import('express').Request} req - Express request; uses `req.user.companyId` and `req.query`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.getAllFaults = async (req, res, next) => {
    try {
        const result = await faultService.getAllFaults(req.user.companyId, req.query);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/faults/:id - Fetches a single fault.
 * @param {import('express').Request} req - Express request; uses `req.user.companyId` and `req.params.id`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.getFaultById = async (req, res, next) => {
    try {
        const fault = await faultService.getFaultById(req.user.companyId, req.params.id);
        res.json(fault);
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/faults - Creates a fault report, optionally with uploaded photos.
 * @param {import('express').Request} req - Express request; uses `req.user.companyId`, `req.user.userId`, `req.body`, and `req.files`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.createFault = async (req, res, next) => {
    try {
        const fault = await faultService.createFault(req.user.companyId, req.user.userId, req.body, req.files);
        res.status(201).json(fault);
    } catch (err) {
        next(err);
    }
};

/**
 * PATCH /api/faults/:id/close - Resolves a fault.
 * @param {import('express').Request} req - Express request; uses `req.user.companyId`, `req.user.userId`, `req.params.id`, and `req.body`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.closeFault = async (req, res, next) => {
    try {
        const fault = await faultService.closeFault(req.user.companyId, req.user.userId, req.params.id, req.body);
        res.json(fault);
    } catch (err) {
        next(err);
    }
};

/**
 * PATCH /api/faults/:id/reopen - Reopens a previously-closed fault.
 * @param {import('express').Request} req - Express request; uses `req.user.companyId` and `req.params.id`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.reopenFault = async (req, res, next) => {
    try {
        const fault = await faultService.reopenFault(req.user.companyId, req.params.id);
        res.json(fault);
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /api/faults/:id - Deletes a fault.
 * @param {import('express').Request} req - Express request; uses `req.user.companyId` and `req.params.id`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.deleteFault = async (req, res, next) => {
    try {
        await faultService.deleteFault(req.user.companyId, req.params.id);
        res.json({ message: 'Fault deleted successfully' });
    } catch (err) {
        next(err);
    }
};

/**
 * PATCH /api/faults/:id - Partially updates a fault's editable fields.
 * @param {import('express').Request} req - Express request; uses `req.user.companyId`, `req.user.userId`, `req.params.id`, and `req.body`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.updateFault = async (req, res, next) => {
    try {
        const fault = await faultService.updateFault(req.user.companyId, req.user.userId, req.params.id, req.body);
        res.json(fault);
    } catch (err) {
        next(err);
    }
};
