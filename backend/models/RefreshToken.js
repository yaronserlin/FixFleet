// models/RefreshToken.js
const mongoose = require('mongoose');

/**
 * A persisted, hashed refresh token, used to support rotation-with-reuse-
 * detection (RTR) in services/authService.js. Raw refresh tokens are never
 * stored -- only the SHA-256 hash of the signed JWT string (`tokenHash`).
 * Tokens issued from the same login/refresh chain share a `familyId`; if a
 * revoked token is presented again, the whole family is revoked (see
 * `rotateRefreshToken`).
 *
 * @typedef {Object} RefreshTokenDocument
 * @property {mongoose.Types.ObjectId} userId - The token's owner. Required, indexed.
 * @property {mongoose.Types.ObjectId} companyId - Tenant scope of the owning user. Required, indexed.
 * @property {string} tokenHash - SHA-256 hex digest of the raw refresh token JWT. Required, indexed.
 * @property {string} familyId - Groups all tokens descended from one login (rotation lineage), for reuse detection. Required, indexed.
 * @property {boolean} [isRevoked=false] - Set true once this token has been rotated (exchanged for a new one) or explicitly revoked (logout, password change, detected reuse).
 * @property {Date} expiresAt - When this token expires. Required; also drives the collection's TTL index (documents are auto-deleted after this time).
 * @property {Date} createdAt - Set automatically (`timestamps: true`).
 * @property {Date} updatedAt - Set automatically (`timestamps: true`).
 */
const RefreshTokenSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true,
    },
    tokenHash: {
        type: String,
        required: true,
        index: true,
    },
    familyId: {
        type: String,
        required: true,
        index: true,
    },
    isRevoked: {
        type: Boolean,
        default: false,
    },
    expiresAt: {
        type: Date,
        required: true,
    },
}, { timestamps: true });

// TTL index to automatically remove expired refresh token documents
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RefreshToken', RefreshTokenSchema);
