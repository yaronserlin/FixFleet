// models/Company.js
const mongoose = require('mongoose');

/**
 * A tenant organization. Every other collection (User, Equipment, Fault,
 * Part, Maintenance, RefreshToken) scopes its documents to a `companyId`,
 * making Company the root of the multi-tenant isolation boundary.
 *
 * @typedef {Object} CompanyDocument
 * @property {string} name - Display name of the company. Required, trimmed.
 * @property {string} slug - URL-safe, globally-unique identifier derived from `name` at registration (see services/authService.js `generateSlug`). Required, unique, lowercased, trimmed.
 * @property {boolean} [isActive=true] - Whether the company account is active. Login and refresh-token rotation both reject when false.
 * @property {Date} createdAt - Set automatically (`timestamps: true`).
 * @property {Date} updatedAt - Set automatically (`timestamps: true`).
 */
const CompanySchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Company', CompanySchema);
