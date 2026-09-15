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

async function createTool(token, overrides = {}) {
    const res = await request(server)
        .post('/api/tools')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Tool', ...overrides });
    return res.body;
}

async function createOperator(adminToken) {
    const email = uniqueEmail('operator');
    const createRes = await request(server)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Operator User', email, password: 'password123', role: 'operator' });
    const loginRes = await request(server).post('/api/auth/login').send({ email, password: 'password123' });
    await request(server)
        .post('/api/auth/me/change-password')
        .set('Authorization', `Bearer ${loginRes.body.token}`)
        .send({ currentPassword: 'password123', newPassword: 'newpassword123', agreeToTerms: true });
    return { token: loginRes.body.token, userId: createRes.body._id };
}

describe('Fault Controller', () => {
    describe('POST /api/faults (createFault)', () => {
        it('rejects a request with no description', async () => {
            const { token } = await registerCompanyAdmin(server);
            const tool = await createTool(token);
            const res = await request(server)
                .post('/api/faults')
                .set('Authorization', `Bearer ${token}`)
                .send({ tool: tool._id });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/description is required/i);
        });

        it('rejects a request with no tool reference', async () => {
            const { token } = await registerCompanyAdmin(server);
            const res = await request(server)
                .post('/api/faults')
                .set('Authorization', `Bearer ${token}`)
                .send({ description: 'Something broke' });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/tool reference is required/i);
        });

        it('rejects a tool that does not belong to the company', async () => {
            const { token } = await registerCompanyAdmin(server);
            const res = await request(server)
                .post('/api/faults')
                .set('Authorization', `Bearer ${token}`)
                .send({ description: 'Something broke', tool: '64b7f3f3f3f3f3f3f3f3f3f3' });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/does not exist in your organization/i);
        });

        it('creates a fault with photo uploads and comma-separated body photos', async () => {
            const { token } = await registerCompanyAdmin(server);
            const tool = await createTool(token);
            const res = await request(server)
                .post('/api/faults')
                .set('Authorization', `Bearer ${token}`)
                .field('tool', tool._id)
                .field('description', 'Leaking hydraulic fluid')
                .field('code', 'ERR-99')
                .field('engineHours', '42')
                .field('photos', 'http://example.com/a.jpg,http://example.com/b.jpg')
                .attach('photos', Buffer.from([0xff, 0xd8, 0xff]), {
                    filename: 'photo.jpg',
                    contentType: 'image/jpeg',
                });
            expect(res.status).toBe(201);
            expect(res.body.photos.length).toBe(3);
            // Engine hours reported on a fault are recorded but only applied to the
            // equipment's currentEngineHours when the fault is resolved (see closeFault /
            // syncEquipmentEngineHours) -- creating a fault never raises it immediately.
            expect(res.body.tool.currentEngineHours).toBe(0);
        });

        it('does not raise tool engine hours when created by an operator', async () => {
            const { token: adminToken } = await registerCompanyAdmin(server);
            const tool = await createTool(adminToken);
            const { token: operatorToken } = await createOperator(adminToken);

            const res = await request(server)
                .post('/api/faults')
                .set('Authorization', `Bearer ${operatorToken}`)
                .send({ description: 'Odd noise', tool: tool._id, engineHours: 500 });
            expect(res.status).toBe(201);
            expect(res.body.tool.currentEngineHours).toBe(0);
        });
    });

    describe('GET /api/faults (getAllFaults)', () => {
        it('filters by status and paginates', async () => {
            const { token } = await registerCompanyAdmin(server);
            const tool = await createTool(token);
            const f1 = await request(server).post('/api/faults').set('Authorization', `Bearer ${token}`)
                .send({ description: 'Fault 1', tool: tool._id });
            await request(server).post('/api/faults').set('Authorization', `Bearer ${token}`)
                .send({ description: 'Fault 2', tool: tool._id });
            await request(server)
                .patch(`/api/faults/${f1.body._id}/close`)
                .set('Authorization', `Bearer ${token}`);

            const openRes = await request(server)
                .get('/api/faults?status=open')
                .set('Authorization', `Bearer ${token}`);
            expect(openRes.status).toBe(200);
            expect(openRes.body.length).toBe(1);

            const pagedRes = await request(server)
                .get('/api/faults?page=1&limit=1')
                .set('Authorization', `Bearer ${token}`);
            expect(pagedRes.body.faults).toHaveLength(1);
            expect(pagedRes.body.total).toBe(2);
        });
    });

    describe('GET /api/faults/:id (getFaultById)', () => {
        it('returns 404 for a non-existent fault', async () => {
            const { token } = await registerCompanyAdmin(server);
            const res = await request(server)
                .get('/api/faults/64b7f3f3f3f3f3f3f3f3f3f3')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(404);
        });
    });

    describe('PATCH /api/faults/:id/close (closeFault)', () => {
        it('returns 404 for a non-existent fault', async () => {
            const { token } = await registerCompanyAdmin(server);
            const res = await request(server)
                .patch('/api/faults/64b7f3f3f3f3f3f3f3f3f3f3/close')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(404);
        });

        it('marks a schedule task overdue when hours remaining <= 0', async () => {
            const { token } = await registerCompanyAdmin(server);
            const tool = await createTool(token);
            await request(server)
                .post(`/api/tools/${tool._id}/schedules`)
                .set('Authorization', `Bearer ${token}`)
                .send({ title: 'Oil change', intervalHours: 100 });

            const faultRes = await request(server)
                .post('/api/faults')
                .set('Authorization', `Bearer ${token}`)
                .send({ description: 'Check engine', tool: tool._id });

            const closeRes = await request(server)
                .patch(`/api/faults/${faultRes.body._id}/close`)
                .set('Authorization', `Bearer ${token}`)
                .send({ engineHours: 150 });
            expect(closeRes.status).toBe(200);
            expect(closeRes.body.status).toBe('closed');

            const toolRes = await request(server)
                .get(`/api/tools/${tool._id}`)
                .set('Authorization', `Bearer ${token}`);
            expect(toolRes.body.maintenanceSchedule[0].status).toBe('overdue');
        });

        it('marks a schedule task due_soon when hours remaining is low but positive', async () => {
            const { token } = await registerCompanyAdmin(server);
            const tool = await createTool(token);
            await request(server)
                .post(`/api/tools/${tool._id}/schedules`)
                .set('Authorization', `Bearer ${token}`)
                .send({ title: 'Oil change', intervalHours: 100 });

            const faultRes = await request(server)
                .post('/api/faults')
                .set('Authorization', `Bearer ${token}`)
                .send({ description: 'Check engine', tool: tool._id });

            const closeRes = await request(server)
                .patch(`/api/faults/${faultRes.body._id}/close`)
                .set('Authorization', `Bearer ${token}`)
                .send({ engineHours: 90 });
            expect(closeRes.status).toBe(200);

            const toolRes = await request(server)
                .get(`/api/tools/${tool._id}`)
                .set('Authorization', `Bearer ${token}`);
            expect(toolRes.body.maintenanceSchedule[0].status).toBe('due_soon');
        });

        it('closes without engine hours when none are supplied', async () => {
            const { token } = await registerCompanyAdmin(server);
            const tool = await createTool(token);
            const faultRes = await request(server)
                .post('/api/faults')
                .set('Authorization', `Bearer ${token}`)
                .send({ description: 'Check engine', tool: tool._id });

            const closeRes = await request(server)
                .patch(`/api/faults/${faultRes.body._id}/close`)
                .set('Authorization', `Bearer ${token}`)
                .send({});
            expect(closeRes.status).toBe(200);
            expect(closeRes.body.closingEngineHours).toBeUndefined();
        });
    });

    describe('PUT/PATCH /api/faults/:id/reopen (reopenFault)', () => {
        it('returns 404 for a non-existent fault', async () => {
            const { token } = await registerCompanyAdmin(server);
            const res = await request(server)
                .put('/api/faults/64b7f3f3f3f3f3f3f3f3f3f3/reopen')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(404);
        });
    });

    describe('DELETE /api/faults/:id (deleteFault)', () => {
        it('returns 404 for a non-existent fault', async () => {
            const { token } = await registerCompanyAdmin(server);
            const res = await request(server)
                .delete('/api/faults/64b7f3f3f3f3f3f3f3f3f3f3')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(404);
        });

        it('deletes a fault and removes it from the tool backref', async () => {
            const { token } = await registerCompanyAdmin(server);
            const tool = await createTool(token);
            const faultRes = await request(server)
                .post('/api/faults')
                .set('Authorization', `Bearer ${token}`)
                .send({ description: 'Check engine', tool: tool._id });

            const delRes = await request(server)
                .delete(`/api/faults/${faultRes.body._id}`)
                .set('Authorization', `Bearer ${token}`);
            expect(delRes.status).toBe(200);

            const toolRes = await request(server)
                .get(`/api/tools/${tool._id}`)
                .set('Authorization', `Bearer ${token}`);
            expect(toolRes.body.faults).toHaveLength(0);
        });
    });

    describe('PUT /api/faults/:id (updateFault)', () => {
        it('returns 404 for a non-existent fault', async () => {
            const { token } = await registerCompanyAdmin(server);
            const res = await request(server)
                .put('/api/faults/64b7f3f3f3f3f3f3f3f3f3f3')
                .set('Authorization', `Bearer ${token}`)
                .send({ description: 'Updated' });
            expect(res.status).toBe(404);
        });

        it('sets status to closed and clears it back to open across two updates', async () => {
            const { token } = await registerCompanyAdmin(server);
            const tool = await createTool(token);
            const faultRes = await request(server)
                .post('/api/faults')
                .set('Authorization', `Bearer ${token}`)
                .send({ description: 'Check engine', tool: tool._id });

            const closeRes = await request(server)
                .put(`/api/faults/${faultRes.body._id}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ status: 'closed', engineHours: 20 });
            expect(closeRes.status).toBe(200);
            expect(closeRes.body.status).toBe('closed');

            const reopenRes = await request(server)
                .put(`/api/faults/${faultRes.body._id}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ status: 'open', code: 'RE-1' });
            expect(reopenRes.status).toBe(200);
            expect(reopenRes.body.status).toBe('open');
            expect(reopenRes.body.code).toBe('RE-1');
        });

        it('ignores an invalid status value', async () => {
            const { token } = await registerCompanyAdmin(server);
            const tool = await createTool(token);
            const faultRes = await request(server)
                .post('/api/faults')
                .set('Authorization', `Bearer ${token}`)
                .send({ description: 'Check engine', tool: tool._id });

            const res = await request(server)
                .put(`/api/faults/${faultRes.body._id}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ status: 'bogus-status', description: 'Still valid' });
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('open');
            expect(res.body.description).toBe('Still valid');
        });
    });
});
