const request = require('supertest');
const { connectTestDB, closeTestDB, registerCompanyAdmin, uniqueEmail } = require('./helpers/setup');

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

async function createUser(adminToken, overrides = {}) {
    const email = uniqueEmail('member');
    const res = await request(server)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Member User', email, password: 'password123', ...overrides });
    return { res, email };
}

describe('Admin User Controller', () => {
    describe('GET /api/admin/users', () => {
        it('lists users for the company sorted by creation, without passwords', async () => {
            const { token } = await registerCompanyAdmin(server);
            await createUser(token);
            const res = await request(server)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(2);
            expect(res.body[0].password).toBeUndefined();
        });
    });

    describe('POST /api/admin/users (createUser)', () => {
        it('rejects a name shorter than 2 characters', async () => {
            const { token } = await registerCompanyAdmin(server);
            const res = await request(server)
                .post('/api/admin/users')
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'A', email: uniqueEmail(), password: 'password123' });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/name must be/i);
        });

        it('rejects an invalid email', async () => {
            const { token } = await registerCompanyAdmin(server);
            const res = await request(server)
                .post('/api/admin/users')
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'Valid Name', email: 'bad-email', password: 'password123' });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/valid email/i);
        });

        it('rejects a short password', async () => {
            const { token } = await registerCompanyAdmin(server);
            const res = await request(server)
                .post('/api/admin/users')
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'Valid Name', email: uniqueEmail(), password: '123' });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/password must be/i);
        });

        it('rejects a duplicate email', async () => {
            const { token, email } = await registerCompanyAdmin(server);
            const res = await request(server)
                .post('/api/admin/users')
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'Valid Name', email, password: 'password123' });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/already exists/i);
        });

        it('always creates the user with the operator role and forces a password change', async () => {
            const { token } = await registerCompanyAdmin(server);
            const { res } = await createUser(token, { role: 'admin' });
            expect(res.status).toBe(201);
            expect(res.body.role).toBe('operator');
            expect(res.body.mustChangePassword).toBe(true);
            expect(res.body.password).toBeUndefined();
        });

        it('blocks a new user from protected endpoints until they change password', async () => {
            const { token } = await registerCompanyAdmin(server);
            const email = uniqueEmail('newop');
            await createUser(token, { email, password: 'initialPassword1' });

            const loginRes = await request(server).post('/api/auth/login').send({
                email,
                password: 'initialPassword1',
            });
            expect(loginRes.status).toBe(200);
            expect(loginRes.body.user.mustChangePassword).toBe(true);
            const opToken = loginRes.body.token;

            // Attempting to access tools/equipment must be rejected with 403
            const toolsRes = await request(server)
                .get('/api/tools')
                .set('Authorization', `Bearer ${opToken}`);
            expect(toolsRes.status).toBe(403);
            expect(toolsRes.body.code).toBe('PASSWORD_CHANGE_REQUIRED');

            // /api/auth/me is allowed
            const meRes = await request(server)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${opToken}`);
            expect(meRes.status).toBe(200);
            expect(meRes.body.mustChangePassword).toBe(true);

            // Change password
            const changeRes = await request(server)
                .post('/api/auth/me/change-password')
                .set('Authorization', `Bearer ${opToken}`)
                .send({ currentPassword: 'initialPassword1', newPassword: 'newSecretPassword1', agreeToTerms: true });
            expect(changeRes.status).toBe(200);

            // Now accessing tools/equipment succeeds
            const toolsAfterRes = await request(server)
                .get('/api/tools')
                .set('Authorization', `Bearer ${opToken}`);
            expect(toolsAfterRes.status).toBe(200);
        });
    });

    describe('PATCH /api/admin/users/:id/role (updateUserRole)', () => {
        it('prevents an admin from changing their own role', async () => {
            const { token, userId } = await registerCompanyAdmin(server);
            const res = await request(server)
                .patch(`/api/admin/users/${userId}/role`)
                .set('Authorization', `Bearer ${token}`)
                .send({ role: 'operator' });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/cannot change their own role/i);
        });

        it('rejects an invalid role value', async () => {
            const { token } = await registerCompanyAdmin(server);
            const { res: createRes } = await createUser(token);
            const res = await request(server)
                .patch(`/api/admin/users/${createRes.body._id}/role`)
                .set('Authorization', `Bearer ${token}`)
                .send({ role: 'superuser' });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/role must be one of/i);
        });

        it('returns 404 for a user outside the company', async () => {
            const { token } = await registerCompanyAdmin(server);
            const res = await request(server)
                .patch('/api/admin/users/64b7f3f3f3f3f3f3f3f3f3f3/role')
                .set('Authorization', `Bearer ${token}`)
                .send({ role: 'mechanic' });
            expect(res.status).toBe(404);
        });

        it('promotes a user to mechanic successfully', async () => {
            const { token } = await registerCompanyAdmin(server);
            const { res: createRes } = await createUser(token);
            const res = await request(server)
                .patch(`/api/admin/users/${createRes.body._id}/role`)
                .set('Authorization', `Bearer ${token}`)
                .send({ role: 'mechanic' });
            expect(res.status).toBe(200);
            expect(res.body.role).toBe('mechanic');
        });

        it('allows demoting a second admin while another admin remains', async () => {
            const { token } = await registerCompanyAdmin(server);
            const { res: createRes } = await createUser(token);
            await request(server)
                .patch(`/api/admin/users/${createRes.body._id}/role`)
                .set('Authorization', `Bearer ${token}`)
                .send({ role: 'admin' });

            const demoteRes = await request(server)
                .patch(`/api/admin/users/${createRes.body._id}/role`)
                .set('Authorization', `Bearer ${token}`)
                .send({ role: 'operator' });
            expect(demoteRes.status).toBe(200);
            expect(demoteRes.body.role).toBe('operator');
        });
    });

    describe('DELETE /api/admin/users/:id (deleteUser)', () => {
        it('prevents an admin from deleting their own account', async () => {
            const { token, userId } = await registerCompanyAdmin(server);
            const res = await request(server)
                .delete(`/api/admin/users/${userId}`)
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/cannot delete your own account/i);
        });

        it('returns 404 for a user outside the company', async () => {
            const { token } = await registerCompanyAdmin(server);
            const res = await request(server)
                .delete('/api/admin/users/64b7f3f3f3f3f3f3f3f3f3f3')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(404);
        });

        it('deletes a non-admin user successfully', async () => {
            const { token } = await registerCompanyAdmin(server);
            const { res: createRes } = await createUser(token);
            const res = await request(server)
                .delete(`/api/admin/users/${createRes.body._id}`)
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(204);
        });

        it('allows deleting a second admin while another admin remains', async () => {
            const { token } = await registerCompanyAdmin(server);
            const { res: createRes } = await createUser(token);
            await request(server)
                .patch(`/api/admin/users/${createRes.body._id}/role`)
                .set('Authorization', `Bearer ${token}`)
                .send({ role: 'admin' });

            const delRes = await request(server)
                .delete(`/api/admin/users/${createRes.body._id}`)
                .set('Authorization', `Bearer ${token}`);
            expect(delRes.status).toBe(204);
        });
    });
});
