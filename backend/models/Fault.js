// models/Fault.js
const mongoose = require('mongoose');
const { FAULT_STATUS, ALL_FAULT_STATUSES } = require('../constants/faultStatus');

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