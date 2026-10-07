// controllers/userController.js
const userService = require('../services/userService');
const { recordAudit, userTarget } = require('../utils/audit');
const { AUDIT_ACTIONS } = require('../constants/audit');

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
        await recordAudit(req, {
            action: AUDIT_ACTIONS.USER_CREATED,
            companyId: req.user.companyId,
            target: userTarget(user),
            metadata: { role: user.role },
        });
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
        const { user, previousRole } = await userService.updateUserRole(req.user.companyId, req.user.userId, req.params.id, req.body);
        await recordAudit(req, {
            action: AUDIT_ACTIONS.USER_ROLE_CHANGED,
            companyId: req.user.companyId,
            target: userTarget(user),
            metadata: { from: previousRole, to: user.role },
        });
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
        const deleted = await userService.deleteUser(req.user.companyId, req.user.userId, req.params.id);
        await recordAudit(req, {
            action: AUDIT_ACTIONS.USER_DELETED,
            companyId: req.user.companyId,
            target: userTarget(deleted),
            metadata: { role: deleted.role },
        });
        res.status(204).end();
    } catch (err) {
        next(err);
    }
};
