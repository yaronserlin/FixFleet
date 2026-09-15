const request = require('supertest');
const { sanitizeInPlace, sanitizeRequest } = require('../middleware/sanitizeMiddleware');
const { connectTestDB, closeTestDB, registerCompanyAdmin } = require('./helpers/setup');

const app = require('../app');
let server;

jest.setTimeout(90000);

beforeAll(async () => {
    await connectTestDB();
    server = app.listen(0);
}, 90000);

afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
    await closeTestDB();
});

describe('sanitizeMiddleware.sanitizeInPlace (direct unit tests)', () => {
    it('strips the exact NoSQL-operator-injection shape end to end', () => {
        const payload = {
            $where: 'this.password.length > 0',
            'a.b': 1,
            nested: { $gt: '' },
        };

        const result = sanitizeInPlace(payload);

        expect(result).toBe(payload); // mutates in place
        expect(result).toEqual({ nested: {} });
        expect(result).not.toHaveProperty('$where');
        expect(result).not.toHaveProperty('a.b');
    });

    it('strips a top-level $-prefixed key', () => {
        const payload = { $ne: null, email: 'a@b.com' };
        sanitizeInPlace(payload);
        expect(payload).toEqual({ email: 'a@b.com' });
    });

    it('strips a key containing a dot anywhere in the object', () => {
        const payload = { 'user.role': 'admin', name: 'Bob' };
        sanitizeInPlace(payload);
        expect(payload).toEqual({ name: 'Bob' });
    });

    it('recurses into nested objects, stripping malicious keys at any depth', () => {
        const payload = { filter: { deep: { $where: 'x', keep: 'ok' } } };
        sanitizeInPlace(payload);
        expect(payload).toEqual({ filter: { deep: { keep: 'ok' } } });
    });

    it('recurses into arrays and array items', () => {
        const payload = {
            list: [{ $gt: 1, ok: 'yes' }, 'plain-string', { nested: { $lt: 5 } }],
        };
        sanitizeInPlace(payload);
        expect(payload.list[0]).toEqual({ ok: 'yes' });
        expect(payload.list[1]).toBe('plain-string');
        expect(payload.list[2]).toEqual({ nested: {} });
    });

    it('leaves a fully-benign object untouched', () => {
        const payload = { email: 'a@b.com', password: 'secret', age: 30 };
        sanitizeInPlace(payload);
        expect(payload).toEqual({ email: 'a@b.com', password: 'secret', age: 30 });
    });

    it('passes through non-object/array primitives unchanged', () => {
        expect(sanitizeInPlace('a string')).toBe('a string');
        expect(sanitizeInPlace(42)).toBe(42);
        expect(sanitizeInPlace(null)).toBe(null);
        expect(sanitizeInPlace(undefined)).toBe(undefined);
        expect(sanitizeInPlace(true)).toBe(true);
    });

    it('handles an empty array and empty object without error', () => {
        expect(sanitizeInPlace([])).toEqual([]);
        expect(sanitizeInPlace({})).toEqual({});
    });
});

describe('sanitizeMiddleware.sanitizeRequest (direct unit tests)', () => {
    it('sanitizes req.body, req.query, and req.params in place and always calls next', () => {
        const req = {
            body: { $where: 'evil', ok: 1 },
            query: { 'a.b': 'evil', page: '2' },
            params: { $ne: 'evil', id: 'abc' },
        };
        const res = {};
        const next = jest.fn();

        sanitizeRequest(req, res, next);

        expect(req.body).toEqual({ ok: 1 });
        expect(req.query).toEqual({ page: '2' });
        expect(req.params).toEqual({ id: 'abc' });
        expect(next).toHaveBeenCalledTimes(1);
    });

    it('tolerates missing body/query/params and still calls next', () => {
        const req = {};
        const res = {};
        const next = jest.fn();

        expect(() => sanitizeRequest(req, res, next)).not.toThrow();
        expect(next).toHaveBeenCalledTimes(1);
    });
});

describe('sanitizeMiddleware integration: real injection attempt against a live endpoint', () => {
    it('rejects a $ne-operator login-bypass attempt instead of matching every document', async () => {
        // Seed at least one real user so a "match everything" injection would
        // otherwise succeed if sanitization were not in place.
        await registerCompanyAdmin(server);

        const res = await request(server)
            .post('/api/auth/login')
            .send({ email: { $ne: null }, password: { $ne: null } });

        // Once sanitized, email/password become {} (empty objects), which
        // authService.login's `typeof email !== 'string'` guard rejects --
        // proving the injection payload never reaches a Mongo query.
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/valid email and password/i);
    });

    it('strips dotted-path operator injection from query params on a real route', async () => {
        const { token } = await registerCompanyAdmin(server);

        const res = await request(server)
            .get('/api/tools')
            .query({ 'page[$ne]': '1' }) // supertest encodes this as a nested query key
            .set('Authorization', `Bearer ${token}`);

        // Whatever shape query parsing produces, the request must not error
        // out or be treated as a Mongo operator -- it should just behave as
        // an ordinary (filtered-down) request.
        expect(res.status).toBe(200);
    });
});
