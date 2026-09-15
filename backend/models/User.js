// models/User.js
const mongoose = require('mongoose');
const { ALL_ROLES, DEFAULT_ROLE } = require('../constants/roles');

/**
 * Title-cases a display name: trims it, splits on whitespace, and
 * capitalizes the first letter of each hyphen-separated segment of each
 * word (so e.g. "mary-jane o'brien" style names round-trip sensibly).
 * Used both as the schema's `set` transform on `name` and again in a
 * `pre('save')` hook as a belt-and-suspenders normalization.
 *
 * @param {*} name - Raw name input; anything that isn't a non-empty string yields `''`.
 * @returns {string} The formatted name, or `''` if `name` was not a usable string.
 */
const formatUserName = (name) => {
    if (!name || typeof name !== 'string') return '';
    const trimmed = name.trim();
    if (!trimmed) return '';
    return trimmed
        .split(/\s+/)
        .map(word => {
            return word
                .split('-')
                .map(part => part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : '')
                .join('-');
        })
        .join(' ');
};

/**
 * A member of a Company (tenant). Authentication, role-based access
 * control (see middleware/authMiddleware.js), and every business
 * operation are scoped through this document.
 *
 * @typedef {Object} UserDocument
 * @property {string} name - Display name. Required, trimmed, and title-cased via {@link formatUserName} both on assignment and on save.
 * @property {string} email - Login identifier. Required, unique (globally, not just per-company), lowercased, trimmed.
 * @property {'operator'|'mechanic'|'admin'} [role='operator'] - Access level; see constants/roles.js. Only an admin can create/delete users or manage roles (middleware/authMiddleware.js `ensureAdmin`); mechanic or admin is required for equipment/fault/maintenance mutations (`ensureMechanicOrAdmin`).
 * @property {string|null} [avatar=null] - `/uploads/<filename>` path to the user's avatar image, or null if unset.
 * @property {string} password - bcrypt hash of the user's password (see constants/auth.js `BCRYPT_SALT_ROUNDS`). Required. Never returned to clients (services strip it before shaping a response).
 * @property {mongoose.Types.ObjectId} companyId - The owning Company (tenant scope). Required, indexed.
 * @property {boolean} [mustChangePassword=false] - When true, the user is restricted to `/auth/me/change-password`, `/auth/logout`, and `GET /auth/me` until they set a new password (see middleware/authMiddleware.js `verifyToken`). Set true for users created by an admin (services/userService.js `createUser`).
 * @property {boolean} [termsAccepted=false] - Whether the user has accepted the Terms of Service / Privacy Policy.
 * @property {Date|null} [termsAcceptedAt=null] - Timestamp of terms acceptance, or null if not yet accepted.
 * @property {Date} createdAt - Set automatically (`timestamps: true`).
 * @property {Date} updatedAt - Set automatically (`timestamps: true`).
 */
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, set: formatUserName },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    role: { type: String, enum: ALL_ROLES, default: DEFAULT_ROLE },
    avatar: { type: String, trim: true, default: null },
    password: { type: String, required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    mustChangePassword: { type: Boolean, default: false },
    termsAccepted: { type: Boolean, default: false },
    termsAcceptedAt: { type: Date, default: null },
}, { timestamps: true });

UserSchema.pre('save', function (next) {
    if (this.name) {
        this.name = formatUserName(this.name);
    }
    next();
});

const User = mongoose.model('User', UserSchema);
User.formatUserName = formatUserName;

module.exports = User;
