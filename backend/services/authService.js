// services/authService.js
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Company = require('../models/Company');
const RefreshToken = require('../models/RefreshToken');
const { ROLES } = require('../constants/roles');
const {
    ACCESS_TOKEN_EXPIRY,
    REFRESH_TOKEN_EXPIRY,
    REFRESH_COOKIE_MAX_AGE,
    BCRYPT_SALT_ROUNDS,
    REFRESH_REUSE_GRACE_MS,
} = require('../constants/auth');
const { httpError } = require('../utils/httpError');
const mediaStorage = require('../utils/mediaStorage');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Resolves the secret used to sign/verify refresh tokens, falling back to
 * a derivative of `JWT_SECRET` when `JWT_REFRESH_SECRET` isn't configured.
 * @returns {string}
 */
const getRefreshSecret = () => process.env.JWT_REFRESH_SECRET || `${process.env.JWT_SECRET}_refresh`;

/**
 * SHA-256 hex digest of a token string, used so raw refresh tokens are
 * never stored at rest (only their hash, in RefreshToken.tokenHash).
 * @param {string} token
 * @returns {string}
 */
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

/**
 * Slugifies a company name into a URL-safe identifier (lowercase,
 * non-alphanumeric runs collapsed to single hyphens, leading/trailing
 * hyphens trimmed).
 * @param {string} name
 * @returns {string}
 */
const generateSlug = (name) => name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

/**
 * Issues a fresh access/refresh token pair for a user and persists the
 * refresh token's hash (for rotation + reuse detection). Reuses an
 * existing `familyId` when rotating, or starts a new family otherwise.
 *
 * @param {Object} user - A User document (needs `_id` and `role`).
 * @param {string|import('mongoose').Types.ObjectId} companyId - The user's company id, embedded in the access token.
 * @param {string} [familyId] - Existing refresh-token family id to continue (rotation), or a new one is generated.
 * @returns {Promise<{ accessToken: string, token: string, refreshToken: string }>}
 */
async function generateTokens(user, companyId, familyId = null) {
    const userIdStr = user._id.toString();
    const companyIdStr = companyId.toString();

    const accessToken = jwt.sign(
        { userId: userIdStr, role: user.role, companyId: companyIdStr },
        process.env.JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY, algorithm: 'HS256' }
    );

    const activeFamilyId = familyId || crypto.randomUUID();

    const refreshToken = jwt.sign(
        { userId: userIdStr, familyId: activeFamilyId, jti: crypto.randomUUID() },
        getRefreshSecret(),
        { expiresIn: REFRESH_TOKEN_EXPIRY, algorithm: 'HS256' }
    );

    const expiresAt = new Date(Date.now() + REFRESH_COOKIE_MAX_AGE);
    await RefreshToken.create({
        userId: user._id,
        companyId,
        tokenHash: hashToken(refreshToken),
        familyId: activeFamilyId,
        expiresAt,
    });

    return { accessToken, token: accessToken, refreshToken };
}

/**
 * Shapes a User (+ populated company) document into the profile object
 * returned by the auth endpoints.
 * @param {Object} user - A User document with `companyId` populated to a Company document.
 * @returns {Object} Plain profile object.
 */
function shapeUserProfile(user) {
    return {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar || null,
        mustChangePassword: Boolean(user.mustChangePassword),
        termsAccepted: Boolean(user.termsAccepted),
        company: user.companyId ? {
            id: user.companyId._id,
            _id: user.companyId._id,
            name: user.companyId.name,
            slug: user.companyId.slug,
        } : undefined,
    };
}

/**
 * Registers a new company and its first (admin) user.
 *
 * @param {{ companyName?: string, name?: string, email?: string, password?: string, agreeToTerms?: boolean, termsAccepted?: boolean }} body - Raw request body.
 * @throws {Error & { status: number }} 400 for any invalid/missing field or a duplicate email.
 * @returns {Promise<{ user: Object, tokens: { accessToken: string, token: string, refreshToken: string } }>}
 */
async function register(body) {
    if (!body || typeof body !== 'object') {
        throw httpError(400, 'No data provided');
    }

    const { companyName, name, email, password, agreeToTerms, termsAccepted } = body;

    if (!companyName || typeof companyName !== 'string' || companyName.trim().length < 2) {
        throw httpError(400, 'Company name must be at least 2 characters');
    }
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
        throw httpError(400, 'Name must be at least 2 characters');
    }
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
        throw httpError(400, 'A valid email address is required');
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
        throw httpError(400, 'Password must be at least 6 characters');
    }
    if (agreeToTerms !== true && termsAccepted !== true) {
        throw httpError(400, 'You must agree to the Terms of Service and Privacy Policy to register');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const baseSlug = generateSlug(companyName.trim()) || 'company';

    // These three checks/computations are independent of one another (none
    // reads a value the others produce), so run them concurrently.
    const [existingUser, slugExists, hashedPassword] = await Promise.all([
        User.findOne({ email: normalizedEmail }),
        Company.findOne({ slug: baseSlug }),
        bcrypt.hash(password, BCRYPT_SALT_ROUNDS),
    ]);

    if (existingUser) {
        throw httpError(400, 'User with this email already exists');
    }

    const slug = slugExists ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug;

    const company = await Company.create({
        name: companyName.trim(),
        slug,
        isActive: true,
    });

    try {
        // Role is strictly admin for the company creator, never from the request body
        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            role: ROLES.ADMIN,
            password: hashedPassword,
            companyId: company._id,
            termsAccepted: true,
            termsAcceptedAt: new Date(),
        });

        const tokens = await generateTokens(user, company._id);

        return {
            user: shapeUserProfile({ ...user.toObject(), companyId: company }),
            tokens,
        };
    } catch (userErr) {
        // Clean up the company if user creation fails, so we don't leave an orphaned company
        await Company.findByIdAndDelete(company._id);
        throw userErr;
    }
}

/**
 * Authenticates a user by email/password.
 *
 * @param {{ email?: string, password?: string }} body - Raw request body.
 * @throws {Error & { status: number }} 400 for missing fields or invalid credentials; 403 if the company account is inactive.
 * @returns {Promise<{ user: Object, tokens: { accessToken: string, token: string, refreshToken: string } }>}
 */
async function login(body) {
    if (!body || typeof body !== 'object') {
        throw httpError(400, 'No data provided');
    }

    const { email, password } = body;

    // NoSQL injection guard: ensure primitive strings
    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
        throw httpError(400, 'Valid email and password are required');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).populate('companyId');

    if (!user || !(await bcrypt.compare(password, user.password))) {
        throw httpError(400, 'Invalid credentials');
    }

    if (!user.companyId || !user.companyId.isActive) {
        throw httpError(403, 'Company account is inactive');
    }

    const tokens = await generateTokens(user, user.companyId._id);

    return { user: shapeUserProfile(user), tokens };
}

/**
 * Rotates a refresh token: verifies it, detects reuse of an
 * already-rotated token (revoking the whole family if so), and issues a
 * new access/refresh token pair under the same family.
 *
 * @param {string} rawRefreshToken - The refresh token presented by the client (cookie or body).
 * @throws {Error & { status: number, code?: string }} 401 if missing/invalid/unrecognized; 403 if the company is inactive or reuse is detected (`code: 'TOKEN_REUSE_DETECTED'`).
 * @returns {Promise<{ tokens: { accessToken: string, token: string, refreshToken: string } }>}
 */
async function rotateRefreshToken(rawRefreshToken) {
    if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
        throw httpError(401, 'Refresh token is required');
    }

    let decoded;
    try {
        decoded = jwt.verify(rawRefreshToken, getRefreshSecret(), { algorithms: ['HS256'] });
    } catch (err) {
        throw httpError(401, 'Invalid or expired refresh token');
    }

    const hashed = hashToken(rawRefreshToken);
    const existingTokenDoc = await RefreshToken.findOne({ tokenHash: hashed });

    if (!existingTokenDoc) {
        throw httpError(401, 'Refresh token not recognized');
    }

    // Reuse detection: if this token was already revoked, someone is reusing
    // an old token! ...unless it was rotated (not revoked for a security
    // reason) moments ago, which is more likely two near-simultaneous
    // requests (e.g. several open browser tabs whose access tokens happen
    // to expire at the same time) racing to refresh than an actual stolen
    // token resurfacing. Tolerate *that specific case* within a short grace
    // window -- by falling through to the normal rotation path below, which
    // mints this racing request its own fresh pair under the same family --
    // and only treat it as compromised once that window has passed.
    //
    // Crucially, `wasRotated` must be checked, not just `isRevoked`: a token
    // revoked by logout or a password-change security sweep must stay
    // immediately, unconditionally final -- it would defeat the point of
    // "log out this session" if a stale tab could still use it for another
    // 30 seconds.
    if (existingTokenDoc.isRevoked) {
        const revokedMsAgo = existingTokenDoc.updatedAt
            ? Date.now() - existingTokenDoc.updatedAt.getTime()
            : Infinity;

        const isTolerableRotationRace = existingTokenDoc.wasRotated && revokedMsAgo <= REFRESH_REUSE_GRACE_MS;

        if (!isTolerableRotationRace) {
            // Revoke all tokens in this family lineage
            await RefreshToken.updateMany(
                { familyId: existingTokenDoc.familyId },
                { isRevoked: true }
            );
            throw httpError(403, 'Compromised token detected: all sessions in this family have been revoked', {
                code: 'TOKEN_REUSE_DETECTED',
            });
        }
    }

    // Verify user and company are still valid and active
    const user = await User.findById(decoded.userId).populate('companyId');
    if (!user) {
        throw httpError(401, 'User not found or deleted');
    }
    if (!user.companyId || !user.companyId.isActive) {
        throw httpError(403, 'Company account is inactive or not found');
    }

    // Invalidate current refresh token (RTR rotation)
    existingTokenDoc.isRevoked = true;
    existingTokenDoc.wasRotated = true;
    await existingTokenDoc.save();

    // Issue new access token + new rotated refresh token under the same familyId
    const tokens = await generateTokens(user, user.companyId._id, existingTokenDoc.familyId);

    return { tokens };
}

/**
 * Revokes a refresh token (if one is presented and recognized). Never
 * throws for a missing/unrecognized token -- logout always "succeeds".
 *
 * @param {string} [rawRefreshToken] - The refresh token presented by the client (cookie or body).
 * @returns {Promise<void>}
 */
async function logout(rawRefreshToken) {
    if (rawRefreshToken && typeof rawRefreshToken === 'string') {
        const hashed = hashToken(rawRefreshToken);
        await RefreshToken.updateOne({ tokenHash: hashed }, { isRevoked: true });
    }
}

/**
 * Fetches the authenticated user's profile. Unlike {@link register}/{@link login},
 * this embeds the full populated Company document (not just id/name/slug),
 * matching the pre-existing `GET /api/auth/me` response shape.
 *
 * @param {string} userId - The requesting user's id.
 * @throws {Error & { status: number }} 404 if the user no longer exists.
 * @returns {Promise<Object>} Profile object with the full company document.
 */
async function getProfile(userId) {
    const user = await User.findById(userId).populate('companyId');
    if (!user) {
        throw httpError(404, 'User not found');
    }
    return {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar || null,
        mustChangePassword: Boolean(user.mustChangePassword),
        termsAccepted: Boolean(user.termsAccepted),
        company: user.companyId,
    };
}

/**
 * Updates the authenticated user's name and/or email. Changing the email
 * requires the current password and must not collide with another user's
 * email.
 *
 * @param {string} userId - The requesting user's id.
 * @param {{ name?: string, email?: string, currentPassword?: string }} body - Raw request body.
 * @throws {Error & { status: number }} 400 for invalid fields, a missing/incorrect password on email change, or an email already in use; 404 if the user no longer exists.
 * @returns {Promise<Object>} Shaped profile object (without a nested `company`, matching the prior response shape).
 */
async function updateProfile(userId, body) {
    const { name, email, currentPassword } = body || {};
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
        throw httpError(400, 'Name must be at least 2 characters');
    }
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
        throw httpError(400, 'Valid email is required');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const currentUser = await User.findById(userId);
    if (!currentUser) {
        throw httpError(404, 'User not found');
    }

    // Verification requirement: changing email requires current password check
    if (normalizedEmail !== currentUser.email) {
        if (!currentPassword || typeof currentPassword !== 'string') {
            throw httpError(400, 'Current password is required to change your email address');
        }
        const passwordMatches = await bcrypt.compare(currentPassword, currentUser.password);
        if (!passwordMatches) {
            throw httpError(400, 'Current password is incorrect');
        }

        const existing = await User.findOne({ email: normalizedEmail });
        if (existing && existing._id.toString() !== userId) {
            throw httpError(400, 'Email already in use');
        }
    }

    currentUser.name = name.trim();
    currentUser.email = normalizedEmail;
    await currentUser.save();

    return {
        id: currentUser._id,
        _id: currentUser._id,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
        avatar: currentUser.avatar || null,
        mustChangePassword: Boolean(currentUser.mustChangePassword),
        termsAccepted: Boolean(currentUser.termsAccepted),
    };
}

/**
 * Sets the authenticated user's avatar to a newly-uploaded image.
 *
 * @param {string} userId - The requesting user's id.
 * @param {{ buffer: Buffer, mimetype: string }} file - The uploaded file (from multer memory storage).
 * @throws {Error & { status: number }} 400 if no file was uploaded; 404 if the user no longer exists.
 * @returns {Promise<Object>} Shaped profile object.
 */
async function uploadAvatar(userId, file) {
    if (!file) {
        throw httpError(400, 'Avatar image file is required');
    }

    const previousUser = await User.findById(userId);
    if (!previousUser) {
        throw httpError(404, 'User not found');
    }
    const previousFileId = mediaStorage.idFromUrl(previousUser.avatar);

    const fileId = await mediaStorage.storeFile({
        buffer: file.buffer,
        filename: `avatar-${userId}`,
        contentType: file.mimetype,
    });
    const avatarUrl = `/uploads/${fileId}`;

    const user = await User.findByIdAndUpdate(
        userId,
        { avatar: avatarUrl },
        { new: true }
    ).populate('companyId');

    if (!user) {
        throw httpError(404, 'User not found');
    }

    if (previousFileId) {
        await mediaStorage.deleteFile(previousFileId);
    }

    return {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        company: user.companyId,
    };
}

/**
 * Changes the authenticated user's password. On a first-login forced
 * password change (`mustChangePassword: true`), the current password is
 * not required, but the Terms of Service must be accepted (either
 * already, or via `agreeToTerms`/`termsAccepted` in this call). Revokes
 * every active refresh token for the user afterward, forcing all other
 * sessions to re-authenticate.
 *
 * @param {string} userId - The requesting user's id.
 * @param {{ currentPassword?: string, newPassword?: string, agreeToTerms?: boolean, termsAccepted?: boolean }} body - Raw request body.
 * @throws {Error & { status: number }} 400 for missing/short new password, missing terms acceptance on forced change, or an incorrect current password; 404 if the user no longer exists.
 * @returns {Promise<{ mustChangePassword: boolean, termsAccepted: boolean }>}
 */
async function changePassword(userId, body) {
    const { currentPassword, newPassword, agreeToTerms, termsAccepted } = body || {};
    const user = await User.findById(userId);
    if (!user) {
        throw httpError(404, 'User not found');
    }

    if (!newPassword || typeof newPassword !== 'string' || (!user.mustChangePassword && (!currentPassword || typeof currentPassword !== 'string'))) {
        throw httpError(400, 'Current and new password are required');
    }
    if (newPassword.length < 6) {
        throw httpError(400, 'New password must be at least 6 characters');
    }

    if (user.mustChangePassword) {
        // First-time login forced password change requires accepting terms if not yet accepted
        if (!user.termsAccepted && agreeToTerms !== true && termsAccepted !== true) {
            throw httpError(400, 'You must agree to the Terms of Service and Privacy Policy to continue');
        }

        // Old password is NOT required during first-time forced password change.
        // If currentPassword was provided from the login page, verify it if present.
        if (currentPassword && typeof currentPassword === 'string') {
            const match = await bcrypt.compare(currentPassword, user.password);
            if (!match) {
                throw httpError(400, 'Current password incorrect');
            }
        }
    } else {
        // Regular password change requires current password verification
        const match = await bcrypt.compare(currentPassword, user.password);
        if (!match) {
            throw httpError(400, 'Current password incorrect');
        }
    }

    user.password = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
    user.mustChangePassword = false;
    if (agreeToTerms === true || termsAccepted === true || !user.termsAccepted) {
        user.termsAccepted = true;
        user.termsAcceptedAt = user.termsAcceptedAt || new Date();
    }
    await user.save();

    // Invalidate all active refresh tokens for this user across all sessions
    await RefreshToken.updateMany({ userId: user._id }, { isRevoked: true });

    return {
        mustChangePassword: false,
        termsAccepted: Boolean(user.termsAccepted),
    };
}

module.exports = {
    register,
    login,
    rotateRefreshToken,
    logout,
    getProfile,
    updateProfile,
    uploadAvatar,
    changePassword,
};
