// models/AuditLog.js
const mongoose = require('mongoose');
const { ALL_AUDIT_ACTIONS, AUDIT_RETENTION_DAYS } = require('../constants/audit');

/**
 * An append-only record of a security- or platform-relevant event (see
 * constants/audit.js). Written by utils/audit.js, read only by the
 * superadmin audit view; nothing updates or deletes entries except the TTL
 * index, which expires them after AUDIT_RETENTION_DAYS.
 *
 * The actor and target are stored as snapshots (name/email/label at the
 * time), so an entry stays readable after that user or company is deleted.
 *
 * @typedef {Object} AuditLogDocument
 * @property {string} action - One of constants/audit.js AUDIT_ACTIONS.
 * @property {{ userId: mongoose.Types.ObjectId, name: string, email: string, role: string }|null} actor - Who did it; null for an anonymous event (e.g. a failed login).
 * @property {mongoose.Types.ObjectId|null} companyId - The tenant the event concerns, if any.
 * @property {{ type: string, id: string, label: string }|null} target - What it was done to.
 * @property {Object} metadata - Action-specific details (e.g. `{ from, to }` for a role change).
 * @property {string|null} ip - Client IP (Express `req.ip`, proxy-aware via `trust proxy`).
 * @property {Date} createdAt - When it happened.
 */
// Explicit sub-schemas: an inline `{ type: ... }` object would make Mongoose
// read the target's own `type` field as a type declaration.
const AuditActorSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    email: String,
    role: String,
}, { _id: false });

const AuditTargetSchema = new mongoose.Schema({
    type: { type: String },
    id: String,
    label: String,
}, { _id: false });

const AuditLogSchema = new mongoose.Schema({
    action: { type: String, enum: ALL_AUDIT_ACTIONS, required: true, index: true },
    actor: { type: AuditActorSchema, default: null },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null, index: true },
    target: { type: AuditTargetSchema, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: { type: String, default: null },
}, { timestamps: { createdAt: true, updatedAt: false } });

// Newest-first listing, plus automatic expiry.
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: AUDIT_RETENTION_DAYS * 24 * 60 * 60 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
