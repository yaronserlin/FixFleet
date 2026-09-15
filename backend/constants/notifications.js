// constants/notifications.js

/**
 * Notification kinds, matching the `type` enum on the Notification schema
 * (see models/Notification.js). Centralized so the services that create
 * notifications and the frontend that renders an icon per type never drift
 * from a typo'd string literal.
 *
 * @type {{ FAULT_REPORTED: 'fault_reported', ANNOUNCEMENT: 'announcement' }}
 */
const NOTIFICATION_TYPES = Object.freeze({
    /** A user reported a fault; sent to the company's mechanics and admins. */
    FAULT_REPORTED: 'fault_reported',
    /** A free-text message an admin broadcast to users in their company. */
    ANNOUNCEMENT: 'announcement',
});

/** All valid notification `type` values. @type {string[]} */
const ALL_NOTIFICATION_TYPES = Object.freeze([
    NOTIFICATION_TYPES.FAULT_REPORTED,
    NOTIFICATION_TYPES.ANNOUNCEMENT,
]);

/**
 * Maximum notifications returned in one page of the feed, and the default
 * when the caller doesn't ask for a specific size.
 */
const NOTIFICATION_PAGE_SIZE = Object.freeze({ DEFAULT: 20, MAX: 100 });

/**
 * Length caps on admin-authored announcement text. Enforced in the service
 * so an oversized payload is rejected before it fans out to every user in
 * the company (and before it's handed to the push service, which has its
 * own ~4KB payload ceiling per the Web Push spec).
 */
const ANNOUNCEMENT_LIMITS = Object.freeze({ TITLE_MAX: 120, BODY_MAX: 1000 });

module.exports = {
    NOTIFICATION_TYPES,
    ALL_NOTIFICATION_TYPES,
    NOTIFICATION_PAGE_SIZE,
    ANNOUNCEMENT_LIMITS,
};
