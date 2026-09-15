// models/Maintenance.js
const mongoose = require('mongoose');

/**
 * A completed maintenance/service log entry for a piece of equipment.
 * Created either directly (services/maintenanceService.js `createMaintenance`)
 * or as a byproduct of completing a scheduled task
 * (services/equipmentService.js `completeSchedule`). Feeds into
 * utils/equipmentEngineHours.js's highest-reading sync.
 *
 * @typedef {Object} MaintenanceDocument
 * @property {mongoose.Types.ObjectId} companyId - Tenant scope. Required, indexed.
 * @property {mongoose.Types.ObjectId} tool - The Equipment this log entry is for. Required.
 * @property {mongoose.Types.ObjectId} mechanic - The User who performed the maintenance. Required.
 * @property {string} details - Free-text description of the work performed. Required, trimmed.
 * @property {number} [engineHours] - Equipment engine-hours reading at time of service. Must be >= 0 if present; contributes to the equipment's `currentEngineHours` (highest-wins).
 * @property {Array<{ text?: string, done?: boolean }>} [checklist] - Snapshot of checklist items completed during this service (see `completeSchedule`). `text` is trimmed; `done` defaults to true.
 * @property {Date} [date] - When the maintenance was performed; defaults to the creation time.
 * @property {Date} createdAt - Set automatically (`timestamps: true`).
 * @property {Date} updatedAt - Set automatically (`timestamps: true`).
 */
const MaintenanceSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true,
    },
    tool: { type: mongoose.Schema.Types.ObjectId, ref: 'Tool', required: true },
    mechanic: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    details: { type: String, required: true, trim: true },
    engineHours: { type: Number, min: 0 },
    checklist: [{
        text: { type: String, trim: true },
        done: { type: Boolean, default: true },
    }],
    date: { type: Date, default: Date.now },
}, { timestamps: true });

MaintenanceSchema.index({ companyId: 1, tool: 1 });
MaintenanceSchema.index({ companyId: 1, mechanic: 1 });

module.exports = mongoose.model('Maintenance', MaintenanceSchema);
