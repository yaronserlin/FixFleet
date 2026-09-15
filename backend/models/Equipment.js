// models/Equipment.js
const mongoose = require('mongoose');
const { ALL_SCHEDULE_STATUSES, SCHEDULE_STATUS } = require('../constants/scheduleStatus');

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
