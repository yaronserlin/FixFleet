// routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const { verifyToken, ensureAdmin } = require('../middleware/authMiddleware');
const { validateObjectId } = require('../middleware/validationMiddleware');
const {
    getMyNotifications,
    getUnreadCount,
    markRead,
    deleteNotification,
    markAllRead,
    sendAnnouncement,
    getPushPublicKey,
    subscribeToPush,
    unsubscribeFromPush,
} = require('../controllers/notificationController');

router.use(verifyToken);

// Every route below reads or writes only the requesting user's own
// notifications (the service scopes by `recipient`), so no extra role
// guard is needed -- except the admin broadcast.
router.get('/', getMyNotifications);
router.get('/unread-count', getUnreadCount);
router.post('/read-all', markAllRead);

// Web push device registration, per browser.
router.get('/push/public-key', getPushPublicKey);
router.post('/push/subscriptions', subscribeToPush);
router.delete('/push/subscriptions', unsubscribeFromPush);

// Role check: only admins can broadcast, and only to their own company
// (the service takes companyId from the token, never from the body).
router.post('/announcements', ensureAdmin, sendAnnouncement);

// Declared last so the literal paths above are never shadowed by `:id`.
router.patch('/:id/read', validateObjectId('id'), markRead);
router.delete('/:id', validateObjectId('id'), deleteNotification);

module.exports = router;
