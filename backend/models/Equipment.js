// models/Equipment.js
const mongoose = require('mongoose');
const { ALL_SCHEDULE_STATUSES, SCHEDULE_STATUS } = require('../constants/scheduleStatus');

/**
 * A piece of equipment/tool being maintained, stored in the `tools`
 * collection (registered under both the `Equipment` and `Tool` model
 * names for backward compatibility -- see models/Tool.js). Owns embedded
 * subdocuments for attached manuals (`books`), recurring service routines
 * (`maintenanceSchedule`, each with its own checklist), and references to
 * reported faults. See services/equipmentService.js for all mutation
 * logic and utils/equipmentEngineHours.js for how `currentEngineHours`
 * and schedule `status` values are kept in sync.
 *
 * @typedef {Object} EquipmentDocument
 * @property {mongoose.Types.ObjectId} companyId - Tenant scope. Required, indexed.
 * @property {string} name - Equipment name. Required, trimmed.
 * @property {string} [serialNumber] - Manufacturer serial number, trimmed.
 * @property {string} [description] - Free-text description, trimmed.
 * @property {string} [model] - Model designation, trimmed.
 * @property {string} [localSerialNumber] - Company-internal asset/serial tag, trimmed.
 * @property {number} [currentEngineHours=0] - Current engine-hours reading; must be >= 0. Kept in sync with the highest reading across closed faults and maintenance logs (see utils/equipmentEngineHours.js).
 * @property {Array<EquipmentBook>} [books] - Attached PDF manuals/documents.
 * @property {Array<MaintenanceScheduleTask>} [maintenanceSchedule] - Recurring service routines.
 * @property {mongoose.Types.ObjectId[]} [faults] - References to Fault documents reported against this equipment.
 * @property {Date} createdAt - Set automatically (`timestamps: true`).
 * @property {Date} updatedAt - Set automatically (`timestamps: true`).
 */

/**
 * An attached PDF manual/document on a piece of equipment.
 * @typedef {Object} EquipmentBook
 * @property {string} title - Book title. Required, trimmed.
 * @property {string} fileUrl - `/uploads/<filename>` path to the stored PDF. Required.
 * @property {string} [fileName] - Original uploaded filename.
 * @property {number} [fileSize] - File size in bytes.
 * @property {Date} [uploadedAt] - Defaults to the time the book was added.
 */

/**
 * A recurring maintenance routine for a piece of equipment, with its own
 * progress checklist reset on each completion (see
 * services/equipmentService.js `completeSchedule`).
 * @typedef {Object} MaintenanceScheduleTask
 * @property {string} title - Task title. Required, trimmed.
 * @property {string} [description] - Free-text description, trimmed.
 * @property {number} [intervalHours=0] - Recurrence interval in engine hours; 0 means hours-based recurrence is disabled for this task.
 * @property {number} [intervalDays=0] - Recurrence interval in calendar days; 0 means date-based recurrence is disabled for this task.
 * @property {number} [lastPerformedHours=0] - Equipment engine-hours reading at the last completion.
 * @property {Date} [lastPerformedDate] - When the task was last completed.
 * @property {number} [nextDueHours=0] - Engine-hours reading at which the task becomes due.
 * @property {Date} [nextDueDate] - Calendar date at which the task becomes due.
 * @property {'normal'|'due_soon'|'overdue'} [status='normal'] - Derived status; see constants/scheduleStatus.js and utils/equipmentEngineHours.js.
 * @property {Array<{ text: string, done?: boolean }>} [checklist] - Sub-items tracked for the current service cycle; `text` required and trimmed, `done` defaults to false.
 * @property {string} [inProgressNotes=''] - Free-text notes captured while the task is being worked, trimmed.
 */
const EquipmentSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true,
    },
    name: { type: String, required: true, trim: true },
    serialNumber: { type: String, trim: true },
    description: { type: String, trim: true },
    model: { type: String, trim: true },
    localSerialNumber: { type: String, trim: true },
    currentEngineHours: { type: Number, default: 0, min: 0 },
    books: [{
        title: { type: String, required: true, trim: true },
        fileUrl: { type: String, required: true },
        fileName: { type: String },
        fileSize: { type: Number },
        uploadedAt: { type: Date, default: Date.now },
    }],
    maintenanceSchedule: [{
        title: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        intervalHours: { type: Number, default: 0 },
        intervalDays: { type: Number, default: 0 },
        lastPerformedHours: { type: Number, default: 0 },
        lastPerformedDate: { type: Date },
        nextDueHours: { type: Number, default: 0 },
        nextDueDate: { type: Date },
        status: { type: String, enum: ALL_SCHEDULE_STATUSES, default: SCHEDULE_STATUS.NORMAL },
        checklist: [{
            text: { type: String, required: true, trim: true },
            done: { type: Boolean, default: false },
        }],
        inProgressNotes: { type: String, trim: true, default: '' },
    }],
    faults: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Fault',
    }],
}, { timestamps: true, collection: 'tools' });

EquipmentSchema.index({ companyId: 1, name: 1 });

const Equipment = mongoose.models.Equipment || mongoose.model('Equipment', EquipmentSchema);
if (!mongoose.models.Tool) {
    mongoose.model('Tool', EquipmentSchema);
}

module.exports = Equipment;
