// controllers/userController.js
const userService = require('../services/userService');

/**
 * GET /api/admin/users - Lists all users in the requesting admin's company.
 * @param {import('express').Request} req - Express request; uses `req.user.companyId`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.getAllUsers = async (req, res, next) => {
    try {
        const users = await userService.getAllUsers(req.user.companyId);
        res.json(users);
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/admin/users - Creates a new user in the requesting admin's company.
 * @param {import('express').Request} req - Express request; uses `req.user.companyId` and `req.body`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.createUser = async (req, res, next) => {
    try {
        const user = await userService.createUser(req.user.companyId, req.body);
        res.status(201).json(user);
    } catch (err) {
        next(err);
    }
};

/**
 * PATCH /api/admin/users/:id/role - Changes a user's role.
 * @param {import('express').Request} req - Express request; uses `req.user.companyId`, `req.user.userId`, `req.params.id`, and `req.body`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.updateUserRole = async (req, res, next) => {
    try {
        const user = await userService.updateUserRole(req.user.companyId, req.user.userId, req.params.id, req.body);
        res.json(user);
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /api/admin/users/:id - Deletes a user.
 * @param {import('express').Request} req - Express request; uses `req.user.companyId`, `req.user.userId`, and `req.params.id`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.deleteUser = async (req, res, next) => {
    try {
        await userService.deleteUser(req.user.companyId, req.user.userId, req.params.id);
        res.status(204).end();
    } catch (err) {
        next(err);
    }
};
