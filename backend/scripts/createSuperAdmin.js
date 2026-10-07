// scripts/createSuperAdmin.js
//
// Creates (or resets the password of) a platform-level superadmin. This is
// the only way to make one -- there is deliberately no API for it.
//
//   npm run create-superadmin -- --email ops@example.com [--name "Platform Admin"]
//
// The password is taken from SUPERADMIN_PASSWORD, or generated and printed
// once. Refuses to touch an email that belongs to a tenant user.
require('dotenv').config();
const crypto = require('crypto');
const { parseArgs } = require('util');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { ROLES } = require('../constants/roles');
const { BCRYPT_SALT_ROUNDS } = require('../constants/auth');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 12;

async function main() {
    const { values } = parseArgs({
        options: {
            email: { type: 'string' },
            name: { type: 'string', default: 'Platform Admin' },
        },
    });

    const email = (values.email || '').trim().toLowerCase();
    if (!EMAIL_REGEX.test(email)) {
        throw new Error('Usage: npm run create-superadmin -- --email <email> [--name "<name>"]');
    }

    const providedPassword = process.env.SUPERADMIN_PASSWORD;
    if (providedPassword && providedPassword.length < MIN_PASSWORD_LENGTH) {
        throw new Error(`SUPERADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }
    const password = providedPassword || crypto.randomBytes(18).toString('base64url');
    const hashed = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    await connectDB();

    const existing = await User.findOne({ email });
    if (existing && existing.role !== ROLES.SUPERADMIN) {
        throw new Error(`${email} belongs to a ${existing.role} of a company; refusing to convert it to a superadmin`);
    }

    if (existing) {
        existing.password = hashed;
        await existing.save();
        // This is the recovery path for a compromised account: end its sessions.
        await RefreshToken.updateMany({ userId: existing._id }, { isRevoked: true });
        console.log(`Reset the password of superadmin ${email} and signed out its sessions`);
    } else {
        await User.create({ name: values.name, email, role: ROLES.SUPERADMIN, password: hashed, companyId: null });
        console.log(`Created superadmin ${email}`);
    }

    if (!providedPassword) {
        console.log(`Generated password (shown only once): ${password}`);
    }
}

main()
    .then(() => mongoose.disconnect())
    .catch(async (err) => {
        console.error(err.message);
        await mongoose.disconnect();
        process.exit(1);
    });
