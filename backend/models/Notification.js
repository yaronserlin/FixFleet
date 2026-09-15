// models/Notification.js
const mongoose = require('mongoose');
const { ALL_NOTIFICATION_TYPES } = require('../constants/notifications');

/**
 * One delivered notification, stored per recipient rather than per event:
 * a fault reported to five mechanics creates five documents. That costs a
 * little duplication but makes the two things the UI actually asks for --
 * "my feed" and "my unread count" -- single-index reads, and lets one
 * recipient mark theirs read without touching anyone else's.
 *
 * This document is the source of truth for the in-app feed. Web push (see
 * services/pushService.js) is a best-effort *transport* layered on top: a
 * push that fails, or a user who never granted permission, still has the
 * notification waiting in their feed.
 *
 * @typedef {Object} NotificationDocument
 * @property {mongoose.Types.ObjectId} companyId - Tenant scope. Required, indexed.
 * @property {mongoose.Types.ObjectId} recipient - The User this copy belongs to. Required, indexed.
 * @property {'fault_reported'|'announcement'} type - What happened; see constants/notifications.js.
 * @property {string} title - Short headline, also used as the push notification's title. Required, trimmed.
 * @property {string} body - Longer text, also used as the push notification's body. Required, trimmed.
 * @property {string|null} [link=null] - In-app route to open when the notification is clicked (e.g. `/equipment/<id>?tab=faults`).
 * @property {mongoose.Types.ObjectId|null} [sender=null] - The User who caused this notification, if any (the fault reporter, or the broadcasting admin).
 * @property {{ faultId?: mongoose.Types.ObjectId, equipmentId?: mongoose.Types.ObjectId }} [data] - Typed references for clients that want to deep-link or group.
 * @property {Date|null} [readAt=null] - When the recipient read it; null while unread.
 * @property {Date} createdAt - Set automatically (`timestamps: true`).
 * @property {Date} updatedAt - Set automatically (`timestamps: true`).
 */
const NotificationSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true,
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    type: { type: String, enum: ALL_NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    link: { type: String, trim: true, default: null },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    data: {
        faultId: { type: mongoose.Schema.Types.ObjectId, ref: 'Fault' },
        equipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tool' },
    },
    readAt: { type: Date, default: null },
}, { timestamps: true });

// The feed query: one recipient's notifications, newest first.
NotificationSchema.index({ recipient: 1, createdAt: -1 });
// The badge query: how many of mine are still unread.
NotificationSchema.index({ recipient: 1, readAt: 1 });
// Tenant-scoped sweeps (e.g. cleanup), kept consistent with the other models.
NotificationSchema.index({ companyId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
