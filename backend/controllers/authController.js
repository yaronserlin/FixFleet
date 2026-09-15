// controllers/authController.js
const crypto = require('crypto');
const User = require('../models/User');
const Company = require('../models/Company');
const RefreshToken = require('../models/RefreshToken');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { ROLES } = require('../constants/roles');
const {
    ACCESS_TOKEN_EXPIRY,
    REFRESH_TOKEN_EXPIRY,
    ACCESS_COOKIE_MAX_AGE,
    REFRESH_COOKIE_MAX_AGE,
    BCRYPT_SALT_ROUNDS,
} = require('../constants/auth');

const getRefreshSecret = () => process.env.JWT_REFRESH_SECRET || `${process.env.JWT_SECRET}_refresh`;

const getCookieOptions = (maxAge, path = '/') => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge,
    path,
});

const hashToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

const generateTokens = async (user, companyId, familyId = null) => {
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

    return {
        accessToken,
        token: accessToken,
        refreshToken,
    };
};

const setAuthCookies = (res, accessToken, refreshToken) => {
    res.cookie('token', accessToken, getCookieOptions(ACCESS_COOKIE_MAX_AGE, '/'));
    res.cookie('accessToken', accessToken, getCookieOptions(ACCESS_COOKIE_MAX_AGE, '/'));
    res.cookie('refreshToken', refreshToken, getCookieOptions(REFRESH_COOKIE_MAX_AGE, '/api/auth'));
};

const clearAuthCookies = (res) => {
    res.clearCookie('token', getCookieOptions(0, '/'));
    res.clearCookie('accessToken', getCookieOptions(0, '/'));
    res.clearCookie('refreshToken', getCookieOptions(0, '/api/auth'));
};

const generateSlug = (name) => {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Company self-service signup (creates Company + first Admin User)
exports.register = async (req, res, next) => {
    try {
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({ message: 'No data provided' });
        }

        const { companyName, name, email, password, agreeToTerms, termsAccepted } = req.body;

        if (!companyName || typeof companyName !== 'string' || companyName.trim().length < 2) {
            return res.status(400).json({ message: 'Company name must be at least 2 characters' });
        }
        if (!name || typeof name !== 'string' || name.trim().length < 2) {
            return res.status(400).json({ message: 'Name must be at least 2 characters' });
        }
        if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
            return res.status(400).json({ message: 'A valid email address is required' });
        }
        if (!password || typeof password !== 'string' || password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }
        if (agreeToTerms !== true && termsAccepted !== true) {
            return res.status(400).json({ message: 'You must agree to the Terms of Service and Privacy Policy to register' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        // Generate unique slug
        let baseSlug = generateSlug(companyName.trim()) || 'company';
        let slug = baseSlug;
        let slugExists = await Company.findOne({ slug });
        if (slugExists) {
            slug = `${baseSlug}-${Date.now().toString(36)}`;
        }

        const company = await Company.create({
            name: companyName.trim(),
            slug,
            isActive: true,
        });

        try {
            const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
            // Critical #1 Fix: Role is strictly admin for company creator, never from req.body
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
            setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

            return res.status(201).json({
                message: 'Company and admin account created successfully',
                accessToken: tokens.accessToken,
                token: tokens.token,
                refreshToken: tokens.refreshToken,
                user: {
                    id: user._id,
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    avatar: user.avatar || null,
                    mustChangePassword: Boolean(user.mustChangePassword),
                    termsAccepted: Boolean(user.termsAccepted),
                    company: {
                        id: company._id,
                        _id: company._id,
                        name: company.name,
                        slug: company.slug,
                    },
                },
            });
        } catch (userErr) {
            // Clean up company if user creation fails
            await Company.findByIdAndDelete(company._id);
            throw userErr;
        }
    } catch (err) {
        next(err);
    }
};

// Login
exports.login = async (req, res, next) => {
    try {
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({ message: 'No data provided' });
        }

        const { email, password } = req.body;

        // High #4: NoSQL injection guard - ensure primitive strings
        if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
            return res.status(400).json({ message: 'Valid email and password are required' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail }).populate('companyId');

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        if (!user.companyId || !user.companyId.isActive) {
            return res.status(403).json({ message: 'Company account is inactive' });
        }

        const tokens = await generateTokens(user, user.companyId._id);
        setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

        return res.json({
            accessToken: tokens.accessToken,
            token: tokens.token,
            refreshToken: tokens.refreshToken,
            user: {
                id: user._id,
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar || null,
                mustChangePassword: Boolean(user.mustChangePassword),
                termsAccepted: Boolean(user.termsAccepted),
                company: {
                    id: user.companyId._id,
                    _id: user.companyId._id,
                    name: user.companyId.name,
                    slug: user.companyId.slug,
                },
            },
        });
    } catch (err) {
        next(err);
    }
};

// Refresh Token with Rotation & Reuse Detection
exports.refreshToken = async (req, res, next) => {
    try {
        const rawRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

        if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
            return res.status(401).json({ message: 'Refresh token is required' });
        }

        let decoded;
        try {
            decoded = jwt.verify(rawRefreshToken, getRefreshSecret(), { algorithms: ['HS256'] });
        } catch (err) {
            return res.status(401).json({ message: 'Invalid or expired refresh token' });
        }

        const hashed = hashToken(rawRefreshToken);
        const existingTokenDoc = await RefreshToken.findOne({ tokenHash: hashed });

        if (!existingTokenDoc) {
            return res.status(401).json({ message: 'Refresh token not recognized' });
        }

        // Reuse detection: if this token was already revoked, someone is reusing an old token!
        if (existingTokenDoc.isRevoked) {
            // Revoke all tokens in this family lineage
            await RefreshToken.updateMany(
                { familyId: existingTokenDoc.familyId },
                { isRevoked: true }
            );
            clearAuthCookies(res);
            return res.status(403).json({
                message: 'Compromised token detected: all sessions in this family have been revoked',
                code: 'TOKEN_REUSE_DETECTED',
            });
        }

        // Verify user and company are still valid and active
        const user = await User.findById(decoded.userId).populate('companyId');
        if (!user) {
            return res.status(401).json({ message: 'User not found or deleted' });
        }
        if (!user.companyId || !user.companyId.isActive) {
            return res.status(403).json({ message: 'Company account is inactive or not found' });
        }

        // Invalidate current refresh token (RTR rotation)
        existingTokenDoc.isRevoked = true;
        await existingTokenDoc.save();

        // Issue new access token + new rotated refresh token under the same familyId
        const tokens = await generateTokens(user, user.companyId._id, existingTokenDoc.familyId);
        setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

        return res.json({
            accessToken: tokens.accessToken,
            token: tokens.token,
            refreshToken: tokens.refreshToken,
        });
    } catch (err) {
        next(err);
    }
};

// Logout
exports.logout = async (req, res, next) => {
    try {
        const rawRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
        if (rawRefreshToken && typeof rawRefreshToken === 'string') {
            const hashed = hashToken(rawRefreshToken);
            await RefreshToken.updateOne({ tokenHash: hashed }, { isRevoked: true });
        }
        clearAuthCookies(res);
        return res.json({ message: 'Logged out successfully' });
    } catch (err) {
        next(err);
    }
};

// Current authenticated user profile
exports.me = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.userId).populate('companyId');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({
            id: user._id,
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar || null,
            mustChangePassword: Boolean(user.mustChangePassword),
            termsAccepted: Boolean(user.termsAccepted),
            company: user.companyId,
        });
    } catch (err) {
        next(err);
    }
};

// Update profile
exports.updateProfile = async (req, res, next) => {
    try {
        const { name, email, currentPassword } = req.body;
        if (!name || typeof name !== 'string' || name.trim().length < 2) {
            return res.status(400).json({ message: 'Name must be at least 2 characters' });
        }
        if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
            return res.status(400).json({ message: 'Valid email is required' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const currentUser = await User.findById(req.user.userId);
        if (!currentUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verification requirement: changing email requires current password check
        if (normalizedEmail !== currentUser.email) {
            if (!currentPassword || typeof currentPassword !== 'string') {
                return res.status(400).json({ message: 'Current password is required to change your email address' });
            }
            const passwordMatches = await bcrypt.compare(currentPassword, currentUser.password);
            if (!passwordMatches) {
                return res.status(400).json({ message: 'Current password is incorrect' });
            }

            const existing = await User.findOne({ email: normalizedEmail });
            if (existing && existing._id.toString() !== req.user.userId) {
                return res.status(400).json({ message: 'Email already in use' });
            }
        }

        currentUser.name = name.trim();
        currentUser.email = normalizedEmail;
        await currentUser.save();

        res.json({
            id: currentUser._id,
            _id: currentUser._id,
            name: currentUser.name,
            email: currentUser.email,
            role: currentUser.role,
            avatar: currentUser.avatar || null,
            mustChangePassword: Boolean(currentUser.mustChangePassword),
            termsAccepted: Boolean(currentUser.termsAccepted),
        });
    } catch (err) {
        next(err);
    }
};

// Upload profile avatar
exports.uploadAvatar = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Avatar image file is required' });
        }

        const avatarUrl = `/uploads/${req.file.filename}`;
        const user = await User.findByIdAndUpdate(
            req.user.userId,
            { avatar: avatarUrl },
            { new: true }
        ).populate('companyId');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            id: user._id,
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            company: user.companyId,
        });
    } catch (err) {
        next(err);
    }
};

// Change password
exports.changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword, agreeToTerms, termsAccepted } = req.body;
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!newPassword || typeof newPassword !== 'string' || (!user.mustChangePassword && (!currentPassword || typeof currentPassword !== 'string'))) {
            return res.status(400).json({ message: 'Current and new password are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters' });
        }

        if (user.mustChangePassword) {
            // First-time login forced password change requires accepting terms if not yet accepted
            if (!user.termsAccepted && agreeToTerms !== true && termsAccepted !== true) {
                return res.status(400).json({ message: 'You must agree to the Terms of Service and Privacy Policy to continue' });
            }

            // Old password is NOT required during first-time forced password change.
            // If currentPassword was provided from the login page, verify it if present.
            if (currentPassword && typeof currentPassword === 'string') {
                const match = await bcrypt.compare(currentPassword, user.password);
                if (!match) {
                    return res.status(400).json({ message: 'Current password incorrect' });
                }
            }
        } else {
            // Regular password change requires current password verification
            const match = await bcrypt.compare(currentPassword, user.password);
            if (!match) {
                return res.status(400).json({ message: 'Current password incorrect' });
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

        res.json({
            message: 'Password changed successfully',
            mustChangePassword: false,
            termsAccepted: Boolean(user.termsAccepted),
        });
    } catch (err) {
        next(err);
    }
};