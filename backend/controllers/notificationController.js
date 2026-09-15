// controllers/notificationController.js
const notificationService = require('../services/notificationService');
const pushService = require('../services/pushService');

/**
 * GET /api/notifications - Lists the requesting user's own notifications.
 * @param {import('express').Request} req - Express request; uses `req.user.companyId`, `req.user.userId`, and `req.query`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.getMyNotifications = async (req, res, next) => {
    try {
        const result = await notificationService.listForUser(
            req.user.companyId,
            req.user.userId,
            req.query
        );
        res.json(result);
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/notifications/unread-count - The badge count, polled by the client.
 * @param {import('express').Request} req - Express request; uses `req.user.companyId` and `req.user.userId`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.getUnreadCount = async (req, res, next) => {
    try {
        const result = await notificationService.getUnreadCount(req.user.companyId, req.user.userId);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

/**
 * PATCH /api/notifications/:id/read - Marks one of the user's notifications read.
 * @param {import('express').Request} req - Express request; uses `req.user.companyId`, `req.user.userId`, and `req.params.id`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.markRead = async (req, res, next) => {
    try {
        const notification = await notificationService.markRead(
            req.user.companyId,
            req.user.userId,
            req.params.id
        );
        res.json(notification);
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/notifications/read-all - Marks every unread notification of the user read.
 * @param {import('express').Request} req - Express request; uses `req.user.companyId` and `req.user.userId`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.markAllRead = async (req, res, next) => {
    try {
        const result = await notificationService.markAllRead(req.user.companyId, req.user.userId);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/notifications/announcements - Admin-only broadcast to the users
 * in the admin's own company.
 * @param {import('express').Request} req - Express request; uses `req.user.companyId`, `req.user`, and `req.body` (`title`, `body`, optional `roles`).
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.sendAnnouncement = async (req, res, next) => {
    try {
        const { recipients } = await notificationService.createAnnouncement(
            req.user.companyId,
            req.user,
            req.body
        );
        res.status(201).json({ recipients });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/notifications/push/public-key - The VAPID public key the browser
 * needs to create a push subscription, plus whether push is configured at
 * all so the client can hide the opt-in instead of failing on subscribe.
 * @param {import('express').Request} req - Express request.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {void}
 */
exports.getPushPublicKey = (req, res) => {
    res.json({
        enabled: pushService.isPushConfigured(),
        publicKey: pushService.getPublicKey(),
    });
};

/**
 * POST /api/notifications/push/subscriptions - Registers this browser's push endpoint.
 * @param {import('express').Request} req - Express request; uses `req.user`, `req.body.subscription` (or the body itself), and the User-Agent header.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.subscribeToPush = async (req, res, next) => {
    try {
        // Accept either `{ subscription: {...} }` or the raw subscription
        // object, since `PushSubscription.toJSON()` is what callers have.
        const subscription = req.body?.subscription || req.body;
        await pushService.saveSubscription(
            req.user.companyId,
            req.user.userId,
            subscription,
            req.get('user-agent')
        );
        res.status(201).json({ subscribed: true });
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /api/notifications/push/subscriptions - Forgets this browser's push endpoint.
 * @param {import('express').Request} req - Express request; uses `req.user.userId` and `req.body.endpoint`.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
exports.unsubscribeFromPush = async (req, res, next) => {
    try {
        const removed = await pushService.removeSubscription(req.user.userId, req.body?.endpoint);
        res.json({ removed });
    } catch (err) {
        next(err);
    }
};
