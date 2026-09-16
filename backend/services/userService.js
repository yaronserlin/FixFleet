// services/userService.js
const User = require('../models/User');
const bcrypt = require('bcrypt');
const { ROLES, ALL_ROLES, DEFAULT_ROLE } = require('../constants/roles');
const { BCRYPT_SALT_ROUNDS } = require('../constants/auth');
const { httpError } = require('../utils/httpError');
const mediaStorage = require('../utils/mediaStorage');

const ALLOWED_ROLES = ALL_ROLES;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Lists every user belonging to a company (admin user-management view),
 * newest first, with password hashes excluded.
 *
 * @param {string} companyId - Tenant scope.
 * @returns {Promise<Array<Object>>} User documents, without `password`.
 */
async function getAllUsers(companyId) {
    return User.find({ companyId })
        .select('-password')
        .sort({ createdAt: -1 });
}

/**
 * Creates a new user within a company. New users are always created with
 * the default (operator) role and `mustChangePassword: true`, regardless
 * of any `role` field the caller sends -- role changes go through
 * {@link updateUserRole} instead.
 *
 * @param {string} companyId - Tenant scope for the new user.
 * @param {{ name?: string, email?: string, password?: string }} body - Raw request body.
 * @throws {Error & { status: number }} 400 if the body is invalid or the email is already taken.
 * @returns {Promise<Object>} The created user (plain object, without `password`).
 */
async function createUser(companyId, body) {
    if (!body || typeof body !== 'object') {
        throw httpError(400, 'No data provided');
    }

    const { name, email, password } = body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
        throw httpError(400, 'Name must be at least 2 characters');
    }
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
        throw httpError(400, 'A valid email address is required');
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
        throw httpError(400, 'Password must be at least 6 characters');
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
        throw httpError(400, 'User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    const user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: DEFAULT_ROLE, // Created by default as operator; can be updated later
        companyId,
        mustChangePassword: true, // Force password change after first login
    });

    const userResponse = user.toObject();
    delete userResponse.password;
    return userResponse;
}

/**
 * Changes a user's role within a company. An admin cannot change their own
 * role, and the last remaining admin of a company cannot be demoted.
 *
 * @param {string} companyId - Tenant scope.
 * @param {string} actingUserId - The id of the user making the request (used for the self-change guard).
 * @param {string} targetUserId - The user whose role is being changed.
 * @param {{ role?: string }} body - Raw request body.
 * @throws {Error & { status: number }} 400 for a self-change attempt, invalid role, or demoting the last admin; 404 if the target user isn't found in this company.
 * @returns {Promise<Object>} The updated user (plain object, without `password`).
 */
async function updateUserRole(companyId, actingUserId, targetUserId, body) {
    // 1. Protection: Admins cannot change their own role via API
    if (String(targetUserId) === String(actingUserId)) {
        throw httpError(400, 'Admins cannot change their own role');
    }

    const { role } = body || {};
    // 2. Validate role is a valid primitive string and in ALLOWED_ROLES
    if (!role || typeof role !== 'string' || !ALLOWED_ROLES.includes(role.trim())) {
        throw httpError(400, `Role must be one of: ${ALLOWED_ROLES.join(', ')}`);
    }

    const targetRole = role.trim();

    // 3. Find the user within the same company (Tenant Isolation)
    const targetUser = await User.findOne({ _id: targetUserId, companyId });
    if (!targetUser) {
        throw httpError(404, 'User not found');
    }

    // 4. Protection: If demoting an existing admin, ensure they are not the only admin in the company
    if (targetUser.role === ROLES.ADMIN && targetRole !== ROLES.ADMIN) {
        const adminCount = await User.countDocuments({ companyId, role: ROLES.ADMIN });
        if (adminCount <= 1) {
            throw httpError(400, 'Cannot demote the only administrator of the company');
        }
    }

    targetUser.role = targetRole;
    await targetUser.save();

    const userResponse = targetUser.toObject();
    delete userResponse.password;
    return userResponse;
}

/**
 * Deletes a user within a company. An admin cannot delete their own
 * account, and the last remaining admin of a company cannot be deleted.
 *
 * @param {string} companyId - Tenant scope.
 * @param {string} actingUserId - The id of the user making the request (used for the self-delete guard).
 * @param {string} targetUserId - The user to delete.
 * @throws {Error & { status: number }} 400 for a self-delete attempt or deleting the last admin; 404 if not found in this company.
 * @returns {Promise<void>}
 */
async function deleteUser(companyId, actingUserId, targetUserId) {
    // 1. Protection: Cannot delete your own account via API
    if (String(targetUserId) === String(actingUserId)) {
        throw httpError(400, 'Cannot delete your own account');
    }

    // 2. Find target user in same tenant
    const targetUser = await User.findOne({ _id: targetUserId, companyId });
    if (!targetUser) {
        throw httpError(404, 'User not found');
    }

    // 3. Protection: Cannot delete the only remaining admin in the company
    if (targetUser.role === ROLES.ADMIN) {
        const adminCount = await User.countDocuments({ companyId, role: ROLES.ADMIN });
        if (adminCount <= 1) {
            throw httpError(400, 'Cannot delete the only administrator of the company');
        }
    }

    await User.findByIdAndDelete(targetUserId);

    const avatarFileId = mediaStorage.idFromUrl(targetUser.avatar);
    if (avatarFileId) {
        await mediaStorage.deleteFile(avatarFileId);
    }
}

module.exports = {
    getAllUsers,
    createUser,
    updateUserRole,
    deleteUser,
};
