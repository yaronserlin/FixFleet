// controllers/userController.js
const User = require('../models/User');
const bcrypt = require('bcrypt');
const { ROLES, ALL_ROLES, DEFAULT_ROLE } = require('../constants/roles');
const { BCRYPT_SALT_ROUNDS } = require('../constants/auth');

const ALLOWED_ROLES = ALL_ROLES;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.getAllUsers = async (req, res, next) => {
    try {
        const users = await User.find({ companyId: req.user.companyId })
            .select('-password')
            .sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        next(err);
    }
};

exports.createUser = async (req, res, next) => {
    try {
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({ message: 'No data provided' });
        }

        const { name, email, password, role } = req.body;

        if (!name || typeof name !== 'string' || name.trim().length < 2) {
            return res.status(400).json({ message: 'Name must be at least 2 characters' });
        }
        if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
            return res.status(400).json({ message: 'A valid email address is required' });
        }
        if (!password || typeof password !== 'string' || password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existing = await User.findOne({ email: normalizedEmail });
        if (existing) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: DEFAULT_ROLE, // Created by default as operator; can be updated later
            companyId: req.user.companyId,
            mustChangePassword: true, // Force password change after first login
        });

        const userResponse = user.toObject();
        delete userResponse.password;

        res.status(201).json(userResponse);
    } catch (err) {
        next(err);
    }
};

exports.updateUserRole = async (req, res, next) => {
    try {
        // 1. Protection: Admins cannot change their own role via API
        if (String(req.params.id) === String(req.user.userId)) {
            return res.status(400).json({ message: 'Admins cannot change their own role' });
        }

        const { role } = req.body;
        // 2. Validate role is a valid primitive string and in ALLOWED_ROLES
        if (!role || typeof role !== 'string' || !ALLOWED_ROLES.includes(role.trim())) {
            return res.status(400).json({ message: `Role must be one of: ${ALLOWED_ROLES.join(', ')}` });
        }

        const targetRole = role.trim();

        // 3. Find the user within the same company (Tenant Isolation)
        const targetUser = await User.findOne({
            _id: req.params.id,
            companyId: req.user.companyId,
        });

        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // 4. Protection: If demoting an existing admin, ensure they are not the only admin in the company
        if (targetUser.role === ROLES.ADMIN && targetRole !== ROLES.ADMIN) {
            const adminCount = await User.countDocuments({
                companyId: req.user.companyId,
                role: ROLES.ADMIN,
            });
            if (adminCount <= 1) {
                return res.status(400).json({ message: 'Cannot demote the only administrator of the company' });
            }
        }

        targetUser.role = targetRole;
        await targetUser.save();

        const userResponse = targetUser.toObject();
        delete userResponse.password;

        res.json(userResponse);
    } catch (err) {
        next(err);
    }
};

exports.deleteUser = async (req, res, next) => {
    try {
        // 1. Protection: Cannot delete your own account via API
        if (String(req.params.id) === String(req.user.userId)) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }

        // 2. Find target user in same tenant
        const targetUser = await User.findOne({
            _id: req.params.id,
            companyId: req.user.companyId,
        });

        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // 3. Protection: Cannot delete the only remaining admin in the company
        if (targetUser.role === ROLES.ADMIN) {
            const adminCount = await User.countDocuments({
                companyId: req.user.companyId,
                role: ROLES.ADMIN,
            });
            if (adminCount <= 1) {
                return res.status(400).json({ message: 'Cannot delete the only administrator of the company' });
            }
        }

        await User.findByIdAndDelete(req.params.id);

        res.status(204).end();
    } catch (err) {
        next(err);
    }
};