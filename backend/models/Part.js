// models/Part.js
const mongoose = require('mongoose');

/**
 * An inventory part, optionally linked to a specific piece of equipment.
 * See services/partService.js for CRUD and the tenant-scoped tool-
 * reference validation.
 *
 * @typedef {Object} PartDocument
 * @property {mongoose.Types.ObjectId} companyId - Tenant scope. Required, indexed.
 * @property {string} name - Part name. Required, trimmed.
 * @property {string} [partNumber] - Manufacturer/catalog part number, trimmed.
 * @property {mongoose.Types.ObjectId} [tool] - The Equipment this part is associated with, if any. When set, services/partService.js validates it belongs to the same `companyId`.
 * @property {number} [inStock=0] - Quantity currently in stock.
 * @property {Date} createdAt - Set automatically (`timestamps: true`).
 * @property {Date} updatedAt - Set automatically (`timestamps: true`).
 */
const PartSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true,
    },
    name: { type: String, required: true, trim: true },
    partNumber: { type: String, trim: true },
    tool: { type: mongoose.Schema.Types.ObjectId, ref: 'Tool' },
    inStock: { type: Number, default: 0 },
}, { timestamps: true });

PartSchema.index({ companyId: 1, tool: 1 });

module.exports = mongoose.model('Part', PartSchema);
