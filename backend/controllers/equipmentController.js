// controllers/equipmentController.js
const equipmentService = require('../services/equipmentService');

/**
 * GET /api/equipment - Lists equipment/tools for the requesting user's company.
 * @param {import('express').Request} req - Express request; uses `req.user.companyId` and `req.query`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.getAllTools = async (req, res, next) => {
    try {
        const result = await equipmentService.getAllTools(req.user.companyId, req.query);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/equipment/:id - Fetches a single tool.
 * @param {import('express').Request} req - Express request; uses `req.user.companyId` and `req.params.id`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.getToolById = async (req, res, next) => {
    try {
        const tool = await equipmentService.getToolById(req.user.companyId, req.params.id);
        res.json(tool);
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/equipment - Creates a piece of equipment/tool.
 * @param {import('express').Request} req - Express request; uses `req.user.companyId` and `req.body`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.createTool = async (req, res, next) => {
    try {
        const tool = await equipmentService.createTool(req.user.companyId, req.body);
        res.status(201).json(tool);
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/equipment/:id - Updates a tool's editable fields.
 * @param {import('express').Request} req - Express request; uses `req.user.companyId`, `req.params.id`, and `req.body`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.updateTool = async (req, res, next) => {
    try {
        const tool = await equipmentService.updateTool(req.user.companyId, req.params.id, req.body);
        res.json(tool);
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /api/equipment/:id - Deletes a tool and cascades cleanup of its dependent records.
 * @param {import('express').Request} req - Express request; uses `req.user.companyId` and `req.params.id`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.deleteTool = async (req, res, next) => {
    try {
        await equipmentService.deleteTool(req.user.companyId, req.params.id);
        res.status(204).end();
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/equipment/:id/books - Attaches an uploaded PDF book/manual to a tool.
 * @param {import('express').Request} req - Express request; uses `req.user.companyId`, `req.params.id`, `req.file`, and `req.body`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.addBook = async (req, res, next) => {
    try {
        const tool = await equipmentService.addBook(req.user.companyId, req.params.id, req.file, req.body);
        res.status(201).json(tool);
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /api/equipment/:id/books/:bookId - Removes a book from a tool.
 * @param {import('express').Request} req - Express request; uses `req.user.companyId`, `req.params.id`, and `req.params.bookId`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.deleteBook = async (req, res, next) => {
    try {
        const tool = await equipmentService.deleteBook(req.user.companyId, req.params.id, req.params.bookId);
        res.json(tool);
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/equipment/:id/schedules - Adds a recurring maintenance schedule task to a tool.
 * @param {import('express').Request} req - Express request; uses `req.user.companyId`, `req.params.id`, and `req.body`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.addSchedule = async (req, res, next) => {
    try {
        const tool = await equipmentService.addSchedule(req.user.companyId, req.params.id, req.body);
        res.status(201).json(tool);
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /api/equipment/:id/schedules/:scheduleId - Removes a maintenance schedule task.
 * @param {import('express').Request} req - Express request; uses `req.user.companyId`, `req.params.id`, and `req.params.scheduleId`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.deleteSchedule = async (req, res, next) => {
    try {
        const tool = await equipmentService.deleteSchedule(req.user.companyId, req.params.id, req.params.scheduleId);
        res.json(tool);
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/equipment/:id/schedules/:scheduleId/complete - Marks a maintenance schedule task complete.
 * @param {import('express').Request} req - Express request; uses `req.user.companyId`, `req.user.userId`, `req.params.id`, `req.params.scheduleId`, and `req.body`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.completeSchedule = async (req, res, next) => {
    try {
        const tool = await equipmentService.completeSchedule(
            req.user.companyId,
            req.user.userId,
            req.params.id,
            req.params.scheduleId,
            req.body
        );
        res.json(tool);
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/equipment/:id/schedules/:scheduleId - Fetches a single maintenance schedule task alongside its parent equipment.
 * @param {import('express').Request} req - Express request; uses `req.user.companyId`, `req.params.id`, and `req.params.scheduleId`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.getSchedule = async (req, res, next) => {
    try {
        const result = await equipmentService.getSchedule(req.user.companyId, req.params.id, req.params.scheduleId);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/equipment/:id/schedules/:scheduleId/checklist - Adds a checklist item to a maintenance schedule task.
 * @param {import('express').Request} req - Express request; uses `req.user.companyId`, `req.params.id`, `req.params.scheduleId`, and `req.body`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.addChecklistItem = async (req, res, next) => {
    try {
        const result = await equipmentService.addChecklistItem(req.user.companyId, req.params.id, req.params.scheduleId, req.body);
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
};

/**
 * PATCH /api/equipment/:id/schedules/:scheduleId/checklist/:itemId - Toggles a checklist item's done state.
 * @param {import('express').Request} req - Express request; uses `req.user.companyId`, `req.params.id`, `req.params.scheduleId`, and `req.params.itemId`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.toggleChecklistItem = async (req, res, next) => {
    try {
        const result = await equipmentService.toggleChecklistItem(req.user.companyId, req.params.id, req.params.scheduleId, req.params.itemId);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /api/equipment/:id/schedules/:scheduleId/checklist/:itemId - Removes a checklist item.
 * @param {import('express').Request} req - Express request; uses `req.user.companyId`, `req.params.id`, `req.params.scheduleId`, and `req.params.itemId`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.deleteChecklistItem = async (req, res, next) => {
    try {
        const result = await equipmentService.deleteChecklistItem(req.user.companyId, req.params.id, req.params.scheduleId, req.params.itemId);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

/**
 * PATCH/PUT/POST /api/equipment/:id/schedules/:scheduleId/progress - Updates in-progress notes on a schedule task.
 * @param {import('express').Request} req - Express request; uses `req.user.companyId`, `req.params.id`, `req.params.scheduleId`, and `req.body`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.updateScheduleProgress = async (req, res, next) => {
    try {
        const result = await equipmentService.updateScheduleProgress(req.user.companyId, req.params.id, req.params.scheduleId, req.body);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

// Aliases for equipment-based naming
exports.getAllEquipment = exports.getAllTools;
exports.getEquipmentById = exports.getToolById;
exports.createEquipment = exports.createTool;
exports.updateEquipment = exports.updateTool;
exports.deleteEquipment = exports.deleteTool;
