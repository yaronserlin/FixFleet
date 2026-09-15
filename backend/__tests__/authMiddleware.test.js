const jwt = require('jsonwebtoken');
const { verifyToken, ensureAdmin, ensureMechanicOrAdmin } = require('../middleware/authMiddleware');
const Company = require('../models/Company');
const { connectTestDB, closeTestDB, createCompanyAndUser } = require('./helpers/setup');

jest.setTimeout(90000);

beforeAll(async () => {
    await connectTestDB();
}, 90000);

afterAll(async () => {
    await closeTestDB();
});

function mockRes() {
    return {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
    };
}

function signAccessToken(userId, overrides = {}) {
    return jwt.sign(
        { userId, role: 'admin', companyId: 'irrelevant', ...overrides.payload },
        process.env.JWT_SECRET,
        { algorithm: 'HS256', expiresIn: overrides.expiresIn || '15m' }
    );
}

// Direct unit tests of the auth middleware functions, called as plain
// functions against mock req/res and a real (mongodb-memory-server) DB, so
// every branch -- including the ones only reachable via cookie-based auth,
// an expired/invalid token, or a torn-down company -- is pinpointed.
describe('authMiddleware.verifyToken', () => {
    it('rejects when no token is present anywhere (no cookies, no header)', async () => {
        const req = { cookies: {}, headers: {} };
        const res = mockRes();
        const next = jest.fn();

        await verifyToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'No token provided' });
        expect(next).not.toHaveBeenCalled();
    });

    it('rejects a malformed Authorization header that does not start with "Bearer "', async () => {
        const req = { cookies: {}, headers: { authorization: 'Basic abc123' } };
        const res = mockRes();
        const next = jest.fn();

        await verifyToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('authenticates via the `token` cookie', async () => {
        const { user, company } = await createCompanyAndUser();
        const token = signAccessToken(user._id.toString());
        const req = { cookies: { token }, headers: {} };
        const res = mockRes();
        const next = jest.fn();

        await verifyToken(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(req.user.userId).toBe(user._id.toString());
        expect(req.user.companyId.toString()).toBe(company._id.toString());
    });

    it('authenticates via the `accessToken` cookie when `token` cookie is absent', async () => {
        const { user } = await createCompanyAndUser();
        const accessToken = signAccessToken(user._id.toString());
        const req = { cookies: { accessToken }, headers: {} };
        const res = mockRes();
        const next = jest.fn();

        await verifyToken(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(req.user.userId).toBe(user._id.toString());
    });

    it('authenticates via a Bearer Authorization header', async () => {
        const { user } = await createCompanyAndUser();
        const token = signAccessToken(user._id.toString());
        const req = { cookies: {}, headers: { authorization: `Bearer ${token}` } };
        const res = mockRes();
        const next = jest.fn();

        await verifyToken(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(req.user.email).toBe(user.email);
        expect(req.user.mustChangePassword).toBe(false);
    });

    it('rejects a token for a user that no longer exists', async () => {
        const { user } = await createCompanyAndUser();
        const token = signAccessToken(user._id.toString());
        await user.deleteOne();

        const req = { cookies: { token }, headers: {} };
        const res = mockRes();
        const next = jest.fn();

        await verifyToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'User not found or deleted' });
        expect(next).not.toHaveBeenCalled();
    });

    it('rejects when the user\'s company has been deleted', async () => {
        const { user, company } = await createCompanyAndUser();
        await Company.findByIdAndDelete(company._id);
        const token = signAccessToken(user._id.toString());

        const req = { cookies: { token }, headers: {} };
        const res = mockRes();
        const next = jest.fn();

        await verifyToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ message: 'Company account is inactive or not found' });
        expect(next).not.toHaveBeenCalled();
    });

    it('rejects when the user\'s company is inactive', async () => {
        const { user } = await createCompanyAndUser({ companyIsActive: false });
        const token = signAccessToken(user._id.toString());

        const req = { cookies: { token }, headers: {} };
        const res = mockRes();
        const next = jest.fn();

        await verifyToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ message: 'Company account is inactive or not found' });
        expect(next).not.toHaveBeenCalled();
    });

    it('rejects an expired token with a machine-readable code', async () => {
        const { user } = await createCompanyAndUser();
        const token = signAccessToken(user._id.toString(), { expiresIn: '-10s' });

        const req = { cookies: { token }, headers: {} };
        const res = mockRes();
        const next = jest.fn();

        await verifyToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
        expect(next).not.toHaveBeenCalled();
    });

    it('rejects a token signed with the wrong secret (tampered/invalid)', async () => {
        const { user } = await createCompanyAndUser();
        const badToken = jwt.sign({ userId: user._id.toString() }, 'totally-wrong-secret', { algorithm: 'HS256' });

        const req = { cookies: { token: badToken }, headers: {} };
        const res = mockRes();
        const next = jest.fn();

        await verifyToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
        expect(next).not.toHaveBeenCalled();
    });

    it('rejects a garbage token string that fails to parse', async () => {
        const req = { cookies: { token: 'not.a.jwt' }, headers: {} };
        const res = mockRes();
        const next = jest.fn();

        await verifyToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
    });

    describe('first-login forced password change gate', () => {
        it('blocks an arbitrary route when mustChangePassword is true', async () => {
            const { user } = await createCompanyAndUser({ mustChangePassword: true });
            const token = signAccessToken(user._id.toString());

            const req = { cookies: { token }, headers: {}, originalUrl: '/api/tools', method: 'GET' };
            const res = mockRes();
            const next = jest.fn();

            await verifyToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                code: 'PASSWORD_CHANGE_REQUIRED',
                mustChangePassword: true,
            }));
            expect(next).not.toHaveBeenCalled();
        });

        it.each([
            ['/api/auth/me/change-password', 'POST'],
            ['/api/auth/logout', 'POST'],
            ['/api/auth/me', 'GET'],
        ])('allows %s (%s) through despite mustChangePassword', async (path, method) => {
            const { user } = await createCompanyAndUser({ mustChangePassword: true });
            const token = signAccessToken(user._id.toString());

            const req = { cookies: { token }, headers: {}, originalUrl: `${path}?x=1`, method };
            const res = mockRes();
            const next = jest.fn();

            await verifyToken(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
            expect(res.status).not.toHaveBeenCalled();
        });

        it('still blocks GET /api/auth/me spelled with a different method', async () => {
            const { user } = await createCompanyAndUser({ mustChangePassword: true });
            const token = signAccessToken(user._id.toString());

            // /auth/me is only exempt on GET; anything else must still be blocked.
            const req = { cookies: { token }, headers: {}, originalUrl: '/api/auth/me', method: 'PUT' };
            const res = mockRes();
            const next = jest.fn();

            await verifyToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
        });
    });
});

describe('authMiddleware.ensureAdmin', () => {
    it('rejects when req.user is missing', () => {
        const req = {};
        const res = mockRes();
        const next = jest.fn();

        ensureAdmin(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden: Admins only' });
        expect(next).not.toHaveBeenCalled();
    });

    it('rejects a non-admin role', () => {
        const req = { user: { role: 'mechanic' } };
        const res = mockRes();
        const next = jest.fn();

        ensureAdmin(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    it('allows an admin through', () => {
        const req = { user: { role: 'admin' } };
        const res = mockRes();
        const next = jest.fn();

        ensureAdmin(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
    });
});

describe('authMiddleware.ensureMechanicOrAdmin', () => {
    it('rejects when req.user is missing', () => {
        const req = {};
        const res = mockRes();
        const next = jest.fn();

        ensureMechanicOrAdmin(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden: Mechanics or Admins only' });
        expect(next).not.toHaveBeenCalled();
    });

    it('rejects an operator', () => {
        const req = { user: { role: 'operator' } };
        const res = mockRes();
        const next = jest.fn();

        ensureMechanicOrAdmin(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    it.each(['mechanic', 'admin'])('allows a %s through', (role) => {
        const req = { user: { role } };
        const res = mockRes();
        const next = jest.fn();

        ensureMechanicOrAdmin(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
    });
});
