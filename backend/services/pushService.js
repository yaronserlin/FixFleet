// services/pushService.js
const mongoose = require('mongoose');
const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');
const logger = require('../utils/logger');
const { httpError } = require('../utils/httpError');

/**
 * Web Push (VAPID) transport for notifications.
 *
 * Push is deliberately *optional*: the in-app feed (models/Notification.js)
 * is the source of truth, and everything here is a best-effort attempt to
 * also surface it on the user's device. With no VAPID keys configured the
 * whole module degrades to a no-op and the app runs exactly as before --
 * so a deployment that hasn't generated keys yet, and the test suite, need
 * no special handling.
 *
 * Generate a key pair once per deployment with:
 *   npx web-push generate-vapid-keys
 * then set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT.
 */

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
// The spec requires a contact URI the push service can reach you at.
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

let configured = false;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    try {
        webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
        configured = true;
    } catch (err) {
        // Malformed keys are a config error, not a reason to refuse to boot:
        // log loudly and carry on with push disabled.
        logger.error(`Web push disabled -- invalid VAPID configuration: ${err.message}`);
    }
} else {
    logger.info('Web push disabled -- VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY not set (in-app notifications still work)');
}

/**
 * Whether web push is usable in this process.
 * @returns {boolean}
 */
function isPushConfigured() {
    return configured;
}

/**
 * The VAPID public key clients need to call `PushManager.subscribe()`.
 * @returns {string} The key, or '' when push isn't configured.
 */
function getPublicKey() {
    return configured ? VAPID_PUBLIC_KEY : '';
}

/**
 * Registers (or re-registers) a browser's push endpoint for a user.
 *
 * Keyed on `endpoint`, which the browser guarantees unique, so the same
 * browser subscribing again updates its row instead of creating a second
 * one that would deliver every notification twice. Re-registering also
 * re-homes an endpoint whose owner changed -- e.g. a shared shop tablet
 * where a second user logs in after the first.
 *
 * @param {string} companyId - Tenant scope.
 * @param {string} userId - The subscribing user.
 * @param {{ endpoint?: string, keys?: { p256dh?: string, auth?: string } }} subscription - Raw `PushSubscription.toJSON()` from the browser.
 * @param {string} [userAgent] - Requesting browser's UA string.
 * @throws {Error & { status: number }} 400 if the subscription is malformed.
 * @returns {Promise<Object>} The stored subscription document.
 */
async function saveSubscription(companyId, userId, subscription, userAgent) {
    const endpoint = subscription && typeof subscription.endpoint === 'string'
        ? subscription.endpoint.trim()
        : '';
    const p256dh = subscription?.keys?.p256dh;
    const auth = subscription?.keys?.auth;

    if (!endpoint || !p256dh || !auth) {
        throw httpError(400, 'A push subscription with an endpoint and keys is required');
    }

    return PushSubscription.findOneAndUpdate(
        { endpoint },
        {
            companyId,
            user: userId,
            endpoint,
            p256dh,
            auth,
            userAgent: typeof userAgent === 'string' ? userAgent.slice(0, 500) : null,
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );
}

/**
 * Removes a browser's push endpoint, scoped to its owner so one user can't
 * unsubscribe another's device.
 *
 * @param {string} userId - The requesting user.
 * @param {string} endpoint - The endpoint to forget.
 * @returns {Promise<boolean>} True if a subscription was removed.
 */
async function removeSubscription(userId, endpoint) {
    if (!endpoint || typeof endpoint !== 'string') {
        throw httpError(400, 'An endpoint is required');
    }
    const result = await PushSubscription.deleteOne({ user: userId, endpoint: endpoint.trim() });
    return result.deletedCount > 0;
}

/**
 * Pushes a payload to every registered device of the given users.
 *
 * Never throws and never rejects: a push failure must not fail the action
 * that triggered it (reporting a fault, sending an announcement). Endpoints
 * the push service reports as gone (404/410) are deleted as we go, which is
 * what keeps the collection from filling with dead rows.
 *
 * @param {Array<string|mongoose.Types.ObjectId>} userIds - Recipients.
 * @param {{ title: string, body: string, link?: string|null, type?: string }} payload - Fields shared by every recipient's push; rendered by the service worker (see frontend/public/push-sw.js).
 * @param {Map<string, string>} [notificationIdByUser] - Each recipient's own Notification `_id`, keyed by user id as a string. Merged into that user's payload as `notificationId` so a tap on the OS notification can mark it read (see push-sw.js's `notificationclick` handler) without the recipient ever opening the in-app list -- omitted entirely for a user not in the map, so callers that don't have per-recipient ids yet degrade to the old shared-payload behavior.
 * @returns {Promise<{ sent: number, failed: number, pruned: number }>} Delivery tally, for logging.
 */
async function sendToUsers(userIds, payload, notificationIdByUser) {
    const tally = { sent: 0, failed: 0, pruned: 0 };

    if (!configured || !Array.isArray(userIds) || userIds.length === 0) {
        return tally;
    }

    let subscriptions;
    try {
        // mongoose.trusted(): userIds is caller-constructed (already-stored
        // recipient ids), not request input -- see the note in
        // notificationService.js's notifyFaultReported for why this is
        // needed under the global `sanitizeFilter` setting (config/db.js).
        subscriptions = await PushSubscription.find({ user: mongoose.trusted({ $in: userIds }) });
    } catch (err) {
        logger.error(`Failed to load push subscriptions: ${err.message}`);
        return tally;
    }

    if (subscriptions.length === 0) {
        return tally;
    }

    await Promise.all(subscriptions.map(async (sub) => {
        try {
            const notificationId = notificationIdByUser?.get(String(sub.user));
            const body = JSON.stringify(
                notificationId ? { ...payload, notificationId } : payload
            );
            await webpush.sendNotification(sub.toWebPushSubscription(), body);
            tally.sent += 1;
        } catch (err) {
            tally.failed += 1;
            // 404/410 mean this endpoint is permanently gone (app uninstalled,
            // subscription revoked). Anything else -- rate limits, transient
            // 5xx -- is worth keeping the subscription for.
            if (err.statusCode === 404 || err.statusCode === 410) {
                try {
                    await PushSubscription.deleteOne({ _id: sub._id });
                    tally.pruned += 1;
                } catch (deleteErr) {
                    logger.error(`Failed to prune dead push subscription: ${deleteErr.message}`);
                }
            } else {
                logger.warn(`Push delivery failed (${err.statusCode || 'no status'}): ${err.message}`);
            }
        }
    }));

    return tally;
}

module.exports = {
    isPushConfigured,
    getPublicKey,
    saveSubscription,
    removeSubscription,
    sendToUsers,
};
