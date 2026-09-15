// controllers/maintenanceController.js
const maintenanceService = require('../services/maintenanceService');

/**
 * GET /api/maintenance - Lists maintenance logs for the requesting user's company.
 * @param {import('express').Request} req - Express request; uses `req.user.companyId` and `req.query`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.getAllMaintenance = async (req, res, next) => {
    try {
        const result = await maintenanceService.getAllMaintenance(req.user.companyId, req.query);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/maintenance/:id - Fetches a single maintenance record.
 * @param {import('express').Request} req - Express request; uses `req.user.companyId` and `req.params.id`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.getMaintenanceById = async (req, res, next) => {
    try {
        const record = await maintenanceService.getMaintenanceById(req.user.companyId, req.params.id);
        res.json(record);
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/maintenance - Logs a maintenance entry for a tool.
 * @param {import('express').Request} req - Express request; uses `req.user.companyId`, `req.user.userId`, and `req.body`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.createMaintenance = async (req, res, next) => {
    try {
        const maintenance = await maintenanceService.createMaintenance(req.user.companyId, req.user.userId, req.body);
        res.status(201).json(maintenance);
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /api/maintenance/:id - Deletes a maintenance record.
 * @param {import('express').Request} req - Express request; uses `req.user.companyId` and `req.params.id`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.deleteMaintenance = async (req, res, next) => {
    try {
        await maintenanceService.deleteMaintenance(req.user.companyId, req.params.id);
        res.json({ message: 'Maintenance record deleted successfully' });
    } catch (err) {
        next(err);
    }
};
