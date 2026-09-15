const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const path = require('path');

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
        refreshToken: res.body.refreshToken,
        cookie: res.headers['set-cookie'] ? res.headers['set-cookie'][0] : undefined,
        cookies: res.headers['set-cookie'],
        userId: res.body.user && res.body.user._id,
        companyId: res.body.user && res.body.user.company && res.body.user.company._id,
        email: payload.email,
        password: payload.password,
    };
}

module.exports = {
    connectTestDB,
    closeTestDB,
    uniqueEmail,
    registerCompanyAdmin,
};
