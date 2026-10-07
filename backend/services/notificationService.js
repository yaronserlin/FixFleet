// services/notificationService.js
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Company = require('../models/Company');
const pushService = require('./pushService');
const logger = require('../utils/logger');
const { httpError } = require('../utils/httpError');
const { MECHANIC_OR_ADMIN_ROLES, ALL_ROLES } = require('../constants/roles');
const {
    NOTIFICATION_TYPES,
    NOTIFICATION_PAGE_SIZE,
    ANNOUNCEMENT_LIMITS,
} = require('../constants/notifications');

/**
 * Creates one Notification per recipient and then attempts a web push to
 * the same set.
 *
 * The database write is what matters: it's awaited, and a failure there
 * propagates. The push is best-effort and swallowed -- a user whose browser
 * never registered, or whose push service is down, still finds the
 * notification in their in-app feed.
 *
 * @param {Object} params
 * @param {string} params.companyId - Tenant scope.
 * @param {Array<{ _id: * }|string>} params.recipients - Users to notify (documents or ids).
 * @param {string} params.type - See constants/notifications.js.
 * @param {string} params.title - Headline, reused as the push title.
 * @param {string} params.body - Detail text, reused as the push body.
 * @param {string|null} [params.link] - In-app route to open on click.
 * @param {string|null} [params.sender] - The user who caused this.
 * @param {{ faultId?: *, equipmentId?: * }} [params.data] - Deep-link references.
 * @returns {Promise<Array<Object>>} The created notification documents.
 */
async function dispatch({ companyId, recipients, type, title, body, link = null, sender = null, data = {} }) {
    const recipientIds = (recipients || [])
        .map(r => (r && r._id ? r._id : r))
        .filter(Boolean);

    if (recipientIds.length === 0) {
        return [];
    }

    const created = await Notification.insertMany(
        recipientIds.map(recipient => ({
            companyId,
            recipient,
            type,
            title,
            body,
            link,
            sender,
            data,
        }))
    );

    // insertMany preserves input order, so `created[i]` is recipientIds[i]'s
    // own notification doc -- this is what lets sendToUsers tell each
    // recipient's push which specific notification to mark read on tap.
    const notificationIdByUser = new Map(
        created.map((doc, i) => [String(recipientIds[i]), String(doc._id)])
    );

    try {
        const tally = await pushService.sendToUsers(recipientIds, { type, title, body, link }, notificationIdByUser);
        if (tally.sent || tally.failed) {
            logger.debug(
                `Push fan-out for "${type}": ${tally.sent} sent, ${tally.failed} failed, ${tally.pruned} pruned`
            );
        }
    } catch (err) {
        // sendToUsers already swallows its own errors; this guard covers
        // anything unexpected so a push problem can never fail the caller's
        // business action.
        logger.error(`Unexpected push fan-out failure for "${type}": ${err.message}`);
    }

    return created;
}

/**
 * Notifies a company's mechanics and admins that a fault was reported.
 *
 * The reporter is excluded -- a mechanic who reports a fault themselves
 * doesn't need to be told about it. Called from services/faultService.js
 * after the fault is persisted.
 *
 * @param {Object} fault - The newly created fault, with `tool` populated if available.
 * @param {{ userId: string, name?: string }} reporter - The user who reported it.
 * @returns {Promise<Array<Object>>} The created notification documents (empty if nobody to notify).
 */
async function notifyFaultReported(fault, reporter) {
    if (!fault) return [];

    // Wrapped with mongoose.trusted(): these operators are built from a
    // fixed role list and the authenticated reporter's own id, not from
    // request input, but `sanitizeFilter` (config/db.js) can't tell that --
    // left untrusted it rewrites `{ $ne: ... }`/`{ $in: ... }` into
    // `{ $eq: { $ne: ... } } `, which then fails to cast.
    const recipients = await User.find({
        companyId: fault.companyId,
        role: mongoose.trusted({ $in: MECHANIC_OR_ADMIN_ROLES }),
        _id: mongoose.trusted({ $ne: reporter?.userId }),
    }).select('_id');

    if (recipients.length === 0) {
        return [];
    }

    const equipmentId = fault.tool?._id || fault.tool;
    const equipmentName = fault.tool?.name || 'equipment';
    const reporterName = reporter?.name || 'Someone';
    const code = fault.code ? `[${fault.code}] ` : '';

    return dispatch({
        companyId: fault.companyId,
        recipients,
        type: NOTIFICATION_TYPES.FAULT_REPORTED,
        title: `New fault on ${equipmentName}`,
        body: `${reporterName} reported: ${code}${fault.description}`,
        // Deep-link to the machine's fault tab, which is where a mechanic
        // acts on this -- not to a generic list they'd have to search.
        link: equipmentId ? `/equipment/${equipmentId}?tab=faults` : '/dashboard',
        sender: reporter?.userId || null,
        data: { faultId: fault._id, equipmentId },
    });
}

/**
 * Validates an announcement payload shared by the company-admin and the
 * superadmin broadcast paths.
 *
 * @param {{ title?: string, body?: string, roles?: string[] }} payload - Raw request body.
 * @throws {Error & { status: number }} 400 if the title/body are missing or too long, or `roles` is empty or contains an unknown role.
 * @returns {{ title: string, body: string, roles: string[]|null }} Trimmed title/body, and the validated role filter (null means every role).
 */
function parseAnnouncement(payload) {
    const { title, body, roles } = payload || {};

    if (!title || typeof title !== 'string' || !title.trim()) {
        throw httpError(400, 'A title is required');
    }
    if (!body || typeof body !== 'string' || !body.trim()) {
        throw httpError(400, 'A message body is required');
    }
    if (title.trim().length > ANNOUNCEMENT_LIMITS.TITLE_MAX) {
        throw httpError(400, `Title must be ${ANNOUNCEMENT_LIMITS.TITLE_MAX} characters or fewer`);
    }
    if (body.trim().length > ANNOUNCEMENT_LIMITS.BODY_MAX) {
        throw httpError(400, `Message must be ${ANNOUNCEMENT_LIMITS.BODY_MAX} characters or fewer`);
    }

    if (roles === undefined) {
        return { title: title.trim(), body: body.trim(), roles: null };
    }

    const requested = Array.isArray(roles) ? roles : [roles];
    const cleaned = requested.filter(r => typeof r === 'string' && r.trim());
    const invalid = cleaned.filter(r => !ALL_ROLES.includes(r));
    if (invalid.length > 0) {
        throw httpError(400, `Unknown role: ${invalid.join(', ')}`);
    }
    // An explicit empty selection means "nobody", which is a mistake
    // worth reporting rather than silently sending to everyone.
    if (cleaned.length === 0) {
        throw httpError(400, 'Select at least one role to notify');
    }
    return { title: title.trim(), body: body.trim(), roles: cleaned };
}

/**
 * Broadcasts an admin-authored announcement to the users in the admin's own
 * company.
 *
 * "Everyone under them" is exactly the tenant boundary: an admin reaches
 * every user sharing their companyId and nobody outside it. `roles` narrows
 * that further (e.g. mechanics only); omitted, it means everyone. The
 * sending admin is excluded from their own broadcast.
 *
 * @param {string} companyId - Tenant scope; taken from the authenticated admin, never from the request body.
 * @param {{ userId: string, name?: string }} sender - The broadcasting admin.
 * @param {{ title?: string, body?: string, roles?: string[] }} payload - Raw request body.
 * @throws {Error & { status: number }} 400 if the title/body are missing, too long, or `roles` contains an unknown role.
 * @returns {Promise<{ recipients: number, notifications: Array<Object> }>}
 */
async function createAnnouncement(companyId, sender, payload = {}) {
    const { title, body, roles } = parseAnnouncement(payload);

    // See the mongoose.trusted() note in notifyFaultReported above --
    // sender?.userId is the authenticated admin's own id, not request input.
    const filter = { companyId, _id: mongoose.trusted({ $ne: sender?.userId }) };
    if (roles) {
        // roles is validated against ALL_ROLES, not raw request input.
        filter.role = mongoose.trusted({ $in: roles });
    }

    const recipients = await User.find(filter).select('_id');

    if (recipients.length === 0) {
        throw httpError(400, 'No users match the selected recipients');
    }

    const notifications = await dispatch({
        companyId,
        recipients,
        type: NOTIFICATION_TYPES.ANNOUNCEMENT,
        title,
        body,
        link: '/notifications',
        sender: sender?.userId || null,
    });

    return { recipients: recipients.length, notifications };
}

/**
 * Broadcasts a superadmin-authored announcement across companies.
 *
 * Recipients are the tenant users of every active company, or only of
 * `companyIds` when given, optionally narrowed by `roles`. Notifications are
 * dispatched once per company so each one still carries its recipient's own
 * `companyId` and stays inside that tenant's feed.
 *
 * @param {{ userId: string }} sender - The broadcasting superadmin.
 * @param {{ title?: string, body?: string, roles?: string[], companyIds?: string[] }} payload - Raw request body.
 * @throws {Error & { status: number }} 400 for an invalid payload, malformed company ids, or no matching recipients.
 * @returns {Promise<{ recipients: number, companies: number }>}
 */
async function createPlatformAnnouncement(sender, payload = {}) {
    const { title, body, roles } = parseAnnouncement(payload);
    const { companyIds } = payload || {};

    const companyFilter = { isActive: true };
    if (companyIds !== undefined) {
        const ids = Array.isArray(companyIds) ? companyIds : [companyIds];
        if (ids.length === 0 || !ids.every(id => typeof id === 'string' && mongoose.isValidObjectId(id))) {
            throw httpError(400, 'companyIds must be a non-empty list of company ids');
        }
        // ids are validated ObjectId strings above, not arbitrary request input.
        companyFilter._id = mongoose.trusted({ $in: ids });
    }
    const companies = await Company.find(companyFilter).select('_id');

    // Server-built filter (validated ids/roles only), hence mongoose.trusted().
    const userFilter = {
        companyId: mongoose.trusted({ $in: companies.map(c => c._id) }),
        role: mongoose.trusted({ $in: roles || ALL_ROLES }),
    };
    const recipients = await User.find(userFilter).select('_id companyId');

    if (recipients.length === 0) {
        throw httpError(400, 'No users match the selected recipients');
    }

    const byCompany = new Map();
    for (const user of recipients) {
        const key = String(user.companyId);
        if (!byCompany.has(key)) byCompany.set(key, []);
        byCompany.get(key).push(user._id);
    }

    for (const [companyId, companyRecipients] of byCompany) {
        await dispatch({
            companyId,
            recipients: companyRecipients,
            type: NOTIFICATION_TYPES.ANNOUNCEMENT,
            title,
            body,
            link: '/notifications',
            sender: sender?.userId || null,
        });
    }

    return { recipients: recipients.length, companies: byCompany.size };
}

/**
 * Lists a user's own notifications, newest first.
 *
 * Scoped by recipient *and* company: a user whose company changed can't
 * pull notifications from the old tenant.
 *
 * @param {string} companyId - Tenant scope.
 * @param {string} userId - The requesting user.
 * @param {{ page?: string|number, limit?: string|number, unreadOnly?: string|boolean }} [query] - Raw query params.
 * @returns {Promise<{ notifications: Array<Object>, unreadCount: number, page: number, limit: number, total: number, pages: number }>}
 */
async function listForUser(companyId, userId, query = {}) {
    const { page, limit, unreadOnly } = query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(
        1,
        Math.min(NOTIFICATION_PAGE_SIZE.MAX, parseInt(limit, 10) || NOTIFICATION_PAGE_SIZE.DEFAULT)
    );

    const filter = { companyId, recipient: userId };
    if (unreadOnly === true || unreadOnly === 'true') {
        filter.readAt = null;
    }

    const [notifications, total, unreadCount] = await Promise.all([
        Notification.find(filter)
            .populate('sender', 'name role avatar')
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum),
        Notification.countDocuments(filter),
        Notification.countDocuments({ companyId, recipient: userId, readAt: null }),
    ]);

    return {
        notifications,
        unreadCount,
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
    };
}

/**
 * Counts a user's unread notifications -- the badge query, kept separate
 * from {@link listForUser} so polling it stays cheap.
 *
 * @param {string} companyId - Tenant scope.
 * @param {string} userId - The requesting user.
 * @returns {Promise<{ unreadCount: number }>}
 */
async function getUnreadCount(companyId, userId) {
    const unreadCount = await Notification.countDocuments({
        companyId,
        recipient: userId,
        readAt: null,
    });
    return { unreadCount };
}

/**
 * Marks one of the user's own notifications read. Idempotent: re-reading an
 * already-read notification keeps the original timestamp.
 *
 * @param {string} companyId - Tenant scope.
 * @param {string} userId - The requesting user; a notification addressed to anyone else is a 404, not a 403, so the endpoint doesn't confirm that someone else's id exists.
 * @param {string} notificationId - The notification to mark.
 * @throws {Error & { status: number }} 404 if it isn't this user's notification.
 * @returns {Promise<Object>} The updated notification.
 */
async function markRead(companyId, userId, notificationId) {
    const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, companyId, recipient: userId, readAt: null },
        { readAt: new Date() },
        { new: true }
    );

    if (notification) {
        return notification;
    }

    // Either it was already read (fine, return it as-is) or it isn't theirs.
    const existing = await Notification.findOne({ _id: notificationId, companyId, recipient: userId });
    if (!existing) {
        throw httpError(404, 'Notification not found');
    }
    return existing;
}

/**
 * Deletes one of the user's own notifications.
 *
 * Scoped by recipient *and* company, like {@link markRead}: a notification
 * addressed to someone else is a 404, not a 403, so the endpoint never
 * confirms that someone else's notification id exists.
 *
 * @param {string} companyId - Tenant scope.
 * @param {string} userId - The requesting user.
 * @param {string} notificationId - The notification to delete.
 * @throws {Error & { status: number }} 404 if it isn't this user's notification.
 * @returns {Promise<void>}
 */
async function deleteNotification(companyId, userId, notificationId) {
    const result = await Notification.deleteOne({ _id: notificationId, companyId, recipient: userId });
    if (result.deletedCount === 0) {
        throw httpError(404, 'Notification not found');
    }
}

/**
 * Marks every unread notification of the user read.
 *
 * @param {string} companyId - Tenant scope.
 * @param {string} userId - The requesting user.
 * @returns {Promise<{ updated: number }>} How many were newly marked.
 */
async function markAllRead(companyId, userId) {
    const result = await Notification.updateMany(
        { companyId, recipient: userId, readAt: null },
        { readAt: new Date() }
    );
    return { updated: result.modifiedCount || 0 };
}

module.exports = {
    dispatch,
    notifyFaultReported,
    createAnnouncement,
    createPlatformAnnouncement,
    listForUser,
    getUnreadCount,
    markRead,
    deleteNotification,
    markAllRead,
};
