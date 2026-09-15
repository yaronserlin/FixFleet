// models/Fault.js
const mongoose = require('mongoose');
const { FAULT_STATUS, ALL_FAULT_STATUSES } = require('../constants/faultStatus');

/**
 * A reported problem on a piece of equipment. Created by any authenticated
 * user (services/faultService.js `createFault`); closing/reopening/editing
 * is restricted to mechanics and admins (`ensureMechanicOrAdmin`).
 * Engine-hours reported here are recorded but only ever applied to the
 * parent Equipment's `currentEngineHours` when the fault is *closed* (via
 * `closingEngineHours`), and only if that reading is higher than what's
 * already recorded (see utils/equipmentEngineHours.js).
 *
 * @typedef {Object} FaultDocument
 * @property {mongoose.Types.ObjectId} companyId - Tenant scope. Required, indexed.
 * @property {string} [code] - Optional short fault/error code, trimmed.
 * @property {mongoose.Types.ObjectId} tool - The Equipment this fault was reported against. Required.
 * @property {mongoose.Types.ObjectId} operator - The User who reported the fault. Required.
 * @property {string} description - Free-text description of the problem. Required, trimmed.
 * @property {string[]} [photos] - `/uploads/<filename>` paths (from multer uploads) and/or externally-hosted photo URLs.
 * @property {number} [engineHours] - Equipment engine-hours reading at the time the fault was reported. Must be >= 0 if present; not applied to the equipment until resolution.
 * @property {number} [closingEngineHours] - Equipment engine-hours reading recorded when the fault was closed. Must be >= 0 if present; this is the value that can raise the equipment's `currentEngineHours`.
 * @property {string} [resolutionDescription=''] - Free-text notes recorded when the fault is closed, trimmed.
 * @property {mongoose.Types.ObjectId} [resolvedBy] - The User who closed the fault, if closed.
 * @property {'open'|'closed'} [status='open'] - Fault lifecycle state; see constants/faultStatus.js.
 * @property {Date} [closedAt] - Timestamp the fault was closed, if closed.
 * @property {Date} createdAt - Set automatically (`timestamps: true`).
 * @property {Date} updatedAt - Set automatically (`timestamps: true`).
 */
const FaultSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true,
    },
    code: { type: String, trim: true },
    tool: { type: mongoose.Schema.Types.ObjectId, ref: 'Tool', required: true },
    operator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    description: { type: String, required: true, trim: true },
    photos: [{ type: String }],
    engineHours: { type: Number, min: 0 },
    closingEngineHours: { type: Number, min: 0 },
    resolutionDescription: { type: String, trim: true, default: '' },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ALL_FAULT_STATUSES, default: FAULT_STATUS.OPEN },
    closedAt: { type: Date },
}, { timestamps: true });

FaultSchema.index({ companyId: 1, tool: 1 });
FaultSchema.index({ companyId: 1, operator: 1 });
FaultSchema.index({ companyId: 1, status: 1 });

module.exports = mongoose.model('Fault', FaultSchema);