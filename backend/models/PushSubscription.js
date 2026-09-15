// models/PushSubscription.js
const mongoose = require('mongoose');

/**
 * A single browser's Web Push endpoint, as handed to us by the client's
 * `PushManager.subscribe()`. One user has as many of these as they have
 * installed browsers/devices, so push fan-out is per subscription, not per
 * user.
 *
 * `endpoint` is globally unique (it already is, by spec: it's a URL minted
 * by the browser's push service). Registering is therefore an upsert keyed
 * on it -- a returning browser re-registers the same endpoint and we update
 * the owner and keys rather than accumulating duplicates that would deliver
 * the same notification twice.
 *
 * Subscriptions expire on their own: a push service answers 404/410 for an
 * endpoint that's been revoked or has gone stale, and services/pushService.js
 * deletes those rows as it encounters them, so this collection self-prunes
 * without a scheduled job.
 *
 * @typedef {Object} PushSubscriptionDocument
 * @property {mongoose.Types.ObjectId} companyId - Tenant scope. Required, indexed.
 * @property {mongoose.Types.ObjectId} user - The subscribed User. Required, indexed.
 * @property {string} endpoint - Push service URL for this browser. Required, globally unique.
 * @property {string} p256dh - The subscription's public encryption key (base64url), from `keys.p256dh`. Required.
 * @property {string} auth - The subscription's auth secret (base64url), from `keys.auth`. Required.
 * @property {string|null} [userAgent=null] - Requesting browser's UA string, so a user can tell their devices apart when managing them.
 * @property {Date} createdAt - Set automatically (`timestamps: true`).
 * @property {Date} updatedAt - Set automatically (`timestamps: true`); refreshed on every re-registration.
 */
const PushSubscriptionSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    endpoint: { type: String, required: true, unique: true },
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
    userAgent: { type: String, default: null },
}, { timestamps: true });

// The fan-out query: every endpoint belonging to a set of recipients.
PushSubscriptionSchema.index({ user: 1, companyId: 1 });

/**
 * Shapes this document the way the `web-push` library expects a
 * subscription object, so callers never hand-assemble it.
 *
 * @returns {{ endpoint: string, keys: { p256dh: string, auth: string } }}
 */
PushSubscriptionSchema.methods.toWebPushSubscription = function toWebPushSubscription() {
    return {
        endpoint: this.endpoint,
        keys: { p256dh: this.p256dh, auth: this.auth },
    };
};

module.exports = mongoose.model('PushSubscription', PushSubscriptionSchema);
