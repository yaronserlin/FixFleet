const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const path = require('path');
const bcrypt = require('bcrypt');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key_minimum_32_characters_long';
process.env.MONGOMS_DOWNLOAD_DIR = path.join(__dirname, '../../.mongo-binaries');

let mongoServer;

// mongodb-memory-server occasionally picks a free port that loses a race
// with another process/instance binding it first ("Port already in use").
// Retry once before giving up so this rare, external timing issue doesn't
// flake out an otherwise-healthy test run.
async function createMongoMemoryServerWithRetry(attempts = 2) {
    let lastErr;
    for (let i = 0; i < attempts; i += 1) {
        try {
            return await MongoMemoryServer.create();
        } catch (err) {
            lastErr = err;
        }
    }
    throw lastErr;
}

async function connectTestDB() {
    mongoServer = await createMongoMemoryServerWithRetry();
    await mongoose.connect(mongoServer.getUri());
}

async function closeTestDB() {
    await mongoose.disconnect();
    if (mongoServer) {
        await mongoServer.stop();
    }
}

// Pulls the raw refresh token out of a response's Set-Cookie header array.
// The refresh token is only ever transported in this HTTP-only cookie now.
function extractRefreshToken(setCookies) {
    const cookie = (setCookies || []).find(c => c.startsWith('refreshToken='));
    if (!cookie) return undefined;
    return decodeURIComponent(cookie.split(';')[0].slice('refreshToken='.length));
}

let counter = 0;
function uniqueEmail(prefix = 'user') {
    counter += 1;
    return `${prefix}${Date.now()}${counter}@example.com`;
}

// Registers a brand new company + admin user via the public API and returns
// the token/cookie/ids needed to act as that admin in further requests.
async function registerCompanyAdmin(app, overrides = {}) {
    counter += 1;
    const payload = {
        companyName: overrides.companyName || `Company ${Date.now()}_${counter}_${Math.random().toString(36).substring(2, 7)}`,
        name: overrides.name || 'Admin User',
        email: overrides.email || uniqueEmail('admin'),
        password: overrides.password || 'password123',
        agreeToTerms: overrides.agreeToTerms !== undefined ? overrides.agreeToTerms : true,
    };
    const res = await request(app).post('/api/auth/register').send(payload);
    return {
        res,
        token: res.body.token,
        accessToken: res.body.accessToken,
        // The API no longer returns the refresh token in response bodies --
        // it is an HTTP-only cookie -- so tests read it from Set-Cookie.
        refreshToken: extractRefreshToken(res.headers['set-cookie']),
        cookie: res.headers['set-cookie'] ? res.headers['set-cookie'][0] : undefined,
        cookies: res.headers['set-cookie'],
        userId: res.body.user && res.body.user._id,
        companyId: res.body.user && res.body.user.company && res.body.user.company._id,
        email: payload.email,
        password: payload.password,
    };
}

// Creates a Company + User directly against the DB (bypassing HTTP), for
// fast/precise unit tests of services or middleware that need a real
// document to operate on but don't need to exercise the registration flow
// itself. Lazily requires the models so this helper stays usable from test
// files that connect to the DB themselves in any order.
async function createCompanyAndUser(overrides = {}) {
    const Company = require('../../models/Company');
    const User = require('../../models/User');

    counter += 1;
    const company = await Company.create({
        name: overrides.companyName || `Direct Co ${Date.now()}_${counter}`,
        slug: overrides.slug || `direct-co-${Date.now()}-${counter}`,
        isActive: overrides.companyIsActive !== undefined ? overrides.companyIsActive : true,
    });

    const rawPassword = overrides.password || 'password123';
    const hashedPassword = overrides.skipHash ? rawPassword : await bcrypt.hash(rawPassword, 4);

    const user = await User.create({
        name: overrides.name || 'Direct User',
        email: overrides.email || uniqueEmail('direct'),
        password: hashedPassword,
        role: overrides.role || 'admin',
        companyId: company._id,
        mustChangePassword: overrides.mustChangePassword || false,
        termsAccepted: overrides.termsAccepted !== undefined ? overrides.termsAccepted : true,
    });

    return { company, user, rawPassword };
}

module.exports = {
    connectTestDB,
    closeTestDB,
    uniqueEmail,
    registerCompanyAdmin,
    createCompanyAndUser,
    extractRefreshToken,
};
