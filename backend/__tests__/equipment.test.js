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

async function createMechanic(adminToken) {
    const email = uniqueEmail('mech');
    const createRes = await request(server)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Mechanic User', email, password: 'password123' });
    await request(server)
        .patch(`/api/admin/users/${createRes.body._id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'mechanic' });
    const loginRes = await request(server).post('/api/auth/login').send({ email, password: 'password123' });
    await request(server)
        .post('/api/auth/me/change-password')
        .set('Authorization', `Bearer ${loginRes.body.token}`)
        .send({ currentPassword: 'password123', newPassword: 'newpassword123', agreeToTerms: true });
    return loginRes.body.token;
}

describe('Equipment/Tool Controller', () => {
    describe('POST /api/tools (createTool)', () => {
        it('rejects a request with no name', async () => {
            const { token } = await registerCompanyAdmin(server);
            const res = await request(server)
                .post('/api/tools')
                .set('Authorization', `Bearer ${token}`)
                .send({ serialNumber: 'SN-1' });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/name is required/i);
        });

        it('rejects a blank name', async () => {
            const { token } = await registerCompanyAdmin(server);
            const res = await request(server)
                .post('/api/tools')
                .set('Authorization', `Bearer ${token}`)
                .send({ name: '   ' });
            expect(res.status).toBe(400);
        });

        it('ignores disallowed fields and negative engine hours', async () => {
            const { token } = await registerCompanyAdmin(server);
            const res = await request(server)
                .post('/api/tools')
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'Guarded Tool', notAllowedField: 'nope', currentEngineHours: -5 });
            expect(res.status).toBe(201);
            expect(res.body.notAllowedField).toBeUndefined();
            expect(res.body.currentEngineHours).toBe(0);
        });
    });

    describe('GET /api/tools (getAllTools)', () => {
        it('paginates results when page/limit are provided', async () => {
            const { token } = await registerCompanyAdmin(server);
            await createTool(token, { name: 'Tool A' });
            await createTool(token, { name: 'Tool B' });
            await createTool(token, { name: 'Tool C' });

            const res = await request(server)
                .get('/api/tools?page=1&limit=2')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body.tools).toHaveLength(2);
            expect(res.body.total).toBe(3);
            expect(res.body.pages).toBe(2);
        });

        it('returns a plain array when no pagination params are given', async () => {
            const { token } = await registerCompanyAdmin(server);
            await createTool(token);
            const res = await request(server)
                .get('/api/tools')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    describe('PUT /api/tools/:id (updateTool)', () => {
        it('rejects an update with no valid fields', async () => {
            const { token } = await registerCompanyAdmin(server);
            const tool = await createTool(token);
            const res = await request(server)
                .put(`/api/tools/${tool._id}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ notAllowed: 'x' });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/no valid fields/i);
        });

        it('returns 404 for a non-existent tool', async () => {
            const { token } = await registerCompanyAdmin(server);
            const res = await request(server)
                .put('/api/tools/64b7f3f3f3f3f3f3f3f3f3f3')
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'New Name' });
            expect(res.status).toBe(404);
        });

        it('updates fields successfully', async () => {
            const { token } = await registerCompanyAdmin(server);
            const tool = await createTool(token);
            const res = await request(server)
                .put(`/api/tools/${tool._id}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'Renamed Tool', model: 'Z-1' });
            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Renamed Tool');
            expect(res.body.model).toBe('Z-1');
        });
    });

    describe('DELETE /api/tools/:id (deleteTool)', () => {
        it('returns 404 for a non-existent tool', async () => {
            const { token } = await registerCompanyAdmin(server);
            const res = await request(server)
                .delete('/api/tools/64b7f3f3f3f3f3f3f3f3f3f3')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(404);
        });

        it('deletes a tool and cascades cleanup', async () => {
            const { token } = await registerCompanyAdmin(server);
            const tool = await createTool(token);
            const res = await request(server)
                .delete(`/api/tools/${tool._id}`)
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(204);

            const getRes = await request(server)
                .get(`/api/tools/${tool._id}`)
                .set('Authorization', `Bearer ${token}`);
            expect(getRes.status).toBe(404);
        });
    });

    describe('Books (PDF) management', () => {
        it('rejects addBook with no file', async () => {
            const { token } = await registerCompanyAdmin(server);
            const tool = await createTool(token);
            const res = await request(server)
                .post(`/api/tools/${tool._id}/books`)
                .set('Authorization', `Bearer ${token}`)
                .field('title', 'Manual');
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/pdf document is required/i);
        });

        it('rejects addBook with no title', async () => {
            const { token } = await registerCompanyAdmin(server);
            const tool = await createTool(token);
            const res = await request(server)
                .post(`/api/tools/${tool._id}/books`)
                .set('Authorization', `Bearer ${token}`)
                .attach('book', Buffer.from('%PDF-1.4'), {
                    filename: 'manual.pdf',
                    contentType: 'application/pdf',
                });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/book title is required/i);
        });

        it('adds and deletes a book successfully', async () => {
            const { token } = await registerCompanyAdmin(server);
            const tool = await createTool(token);
            const addRes = await request(server)
                .post(`/api/tools/${tool._id}/books`)
                .set('Authorization', `Bearer ${token}`)
                .field('title', 'User Manual')
                .attach('book', Buffer.from('%PDF-1.4'), {
                    filename: 'manual.pdf',
                    contentType: 'application/pdf',
                });
            expect(addRes.status).toBe(201);
            expect(addRes.body.books).toHaveLength(1);
            const bookId = addRes.body.books[0]._id;

            const delRes = await request(server)
                .delete(`/api/tools/${tool._id}/books/${bookId}`)
                .set('Authorization', `Bearer ${token}`);
            expect(delRes.status).toBe(200);
            expect(delRes.body.books).toHaveLength(0);
        });

        it('returns 404 when adding a book to a non-existent tool', async () => {
            const { token } = await registerCompanyAdmin(server);
            const res = await request(server)
                .post('/api/tools/64b7f3f3f3f3f3f3f3f3f3f3/books')
                .set('Authorization', `Bearer ${token}`)
                .field('title', 'Manual')
                .attach('book', Buffer.from('%PDF-1.4'), {
                    filename: 'manual.pdf',
                    contentType: 'application/pdf',
                });
            expect(res.status).toBe(404);
        });

        it('allows a mechanic to add and delete a book', async () => {
            const { token: adminToken } = await registerCompanyAdmin(server);
            const tool = await createTool(adminToken);
            const mechToken = await createMechanic(adminToken);

            const addRes = await request(server)
                .post(`/api/tools/${tool._id}/books`)
                .set('Authorization', `Bearer ${mechToken}`)
                .field('title', 'Mechanic Manual')
                .attach('book', Buffer.from('%PDF-1.4'), {
                    filename: 'manual.pdf',
                    contentType: 'application/pdf',
                });
            expect(addRes.status).toBe(201);
            expect(addRes.body.books).toHaveLength(1);
            const bookId = addRes.body.books[0]._id;

            const delRes = await request(server)
                .delete(`/api/tools/${tool._id}/books/${bookId}`)
                .set('Authorization', `Bearer ${mechToken}`);
            expect(delRes.status).toBe(200);
            expect(delRes.body.books).toHaveLength(0);
        });
    });

    describe('Maintenance schedule management', () => {
        it('rejects addSchedule with no title', async () => {
            const { token } = await registerCompanyAdmin(server);
            const tool = await createTool(token);
            const res = await request(server)
                .post(`/api/tools/${tool._id}/schedules`)
                .set('Authorization', `Bearer ${token}`)
                .send({ intervalHours: 100 });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/schedule title is required/i);
        });

        it('returns 404 for addSchedule on a non-existent tool', async () => {
            const { token } = await registerCompanyAdmin(server);
            const res = await request(server)
                .post('/api/tools/64b7f3f3f3f3f3f3f3f3f3f3/schedules')
                .set('Authorization', `Bearer ${token}`)
                .send({ title: 'Oil change' });
            expect(res.status).toBe(404);
        });

        it('creates a schedule with a string-based checklist', async () => {
            const { token } = await registerCompanyAdmin(server);
            const tool = await createTool(token);
            const res = await request(server)
                .post(`/api/tools/${tool._id}/schedules`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    title: 'Oil Change',
                    intervalHours: 100,
                    intervalDays: 30,
                    checklist: ['Check oil', { text: 'Check filter' }, '   '],
                });
            expect(res.status).toBe(201);
            const schedule = res.body.maintenanceSchedule[0];
            expect(schedule.checklist).toHaveLength(2);
        });

        it('deletes a schedule', async () => {
            const { token } = await registerCompanyAdmin(server);
            const tool = await createTool(token);
            const addRes = await request(server)
                .post(`/api/tools/${tool._id}/schedules`)
                .set('Authorization', `Bearer ${token}`)
                .send({ title: 'Oil Change' });
            const scheduleId = addRes.body.maintenanceSchedule[0]._id;

            const delRes = await request(server)
                .delete(`/api/tools/${tool._id}/schedules/${scheduleId}`)
                .set('Authorization', `Bearer ${token}`);
            expect(delRes.status).toBe(200);
            expect(delRes.body.maintenanceSchedule).toHaveLength(0);
        });

        it('allows a mechanic to add and delete a schedule', async () => {
            const { token: adminToken } = await registerCompanyAdmin(server);
            const tool = await createTool(adminToken);
            const mechToken = await createMechanic(adminToken);

            const addRes = await request(server)
                .post(`/api/tools/${tool._id}/schedules`)
                .set('Authorization', `Bearer ${mechToken}`)
                .send({ title: 'Mechanic 250h Service', intervalHours: 250 });
            expect(addRes.status).toBe(201);
            expect(addRes.body.maintenanceSchedule).toHaveLength(1);
            const scheduleId = addRes.body.maintenanceSchedule[0]._id;

            const delRes = await request(server)
                .delete(`/api/tools/${tool._id}/schedules/${scheduleId}`)
                .set('Authorization', `Bearer ${mechToken}`);
            expect(delRes.status).toBe(200);
            expect(delRes.body.maintenanceSchedule).toHaveLength(0);
        });

        it('returns 404 when getSchedule cannot find the schedule', async () => {
            const { token } = await registerCompanyAdmin(server);
            const tool = await createTool(token);
            const res = await request(server)
                .get(`/api/tools/${tool._id}/schedules/64b7f3f3f3f3f3f3f3f3f3f3`)
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(404);
        });

        it('completes a schedule and records a maintenance entry', async () => {
            const { token } = await registerCompanyAdmin(server);
            const tool = await createTool(token);
            const addRes = await request(server)
                .post(`/api/tools/${tool._id}/schedules`)
                .set('Authorization', `Bearer ${token}`)
                .send({ title: 'Oil Change', intervalHours: 100, intervalDays: 30 });
            const scheduleId = addRes.body.maintenanceSchedule[0]._id;

            const completeRes = await request(server)
                .post(`/api/tools/${tool._id}/schedules/${scheduleId}/complete`)
                .set('Authorization', `Bearer ${token}`)
                .send({ currentEngineHours: 150, notes: 'Done' });
            expect(completeRes.status).toBe(200);
            const completedTask = completeRes.body.maintenanceSchedule[0];
            expect(completedTask.status).toBe('normal');
            expect(completedTask.nextDueHours).toBe(250);

            const maintenanceRes = await request(server)
                .get('/api/maintenance')
                .set('Authorization', `Bearer ${token}`);
            expect(maintenanceRes.body.length).toBeGreaterThan(0);
        });

        it('returns 404 completing a non-existent schedule task', async () => {
            const { token } = await registerCompanyAdmin(server);
            const tool = await createTool(token);
            const res = await request(server)
                .post(`/api/tools/${tool._id}/schedules/64b7f3f3f3f3f3f3f3f3f3f3/complete`)
                .set('Authorization', `Bearer ${token}`)
                .send({});
            expect(res.status).toBe(404);
        });
    });

    describe('Checklist item management', () => {
        async function createToolWithSchedule(token) {
            const tool = await createTool(token);
            const addRes = await request(server)
                .post(`/api/tools/${tool._id}/schedules`)
                .set('Authorization', `Bearer ${token}`)
                .send({ title: 'Oil Change' });
            return { toolId: tool._id, scheduleId: addRes.body.maintenanceSchedule[0]._id };
        }

        it('rejects addChecklistItem with no text', async () => {
            const { token } = await registerCompanyAdmin(server);
            const { toolId, scheduleId } = await createToolWithSchedule(token);
            const res = await request(server)
                .post(`/api/tools/${toolId}/schedules/${scheduleId}/checklist`)
                .set('Authorization', `Bearer ${token}`)
                .send({});
            expect(res.status).toBe(400);
        });

        it('returns 404 when the schedule does not exist', async () => {
            const { token } = await registerCompanyAdmin(server);
            const tool = await createTool(token);
            const res = await request(server)
                .post(`/api/tools/${tool._id}/schedules/64b7f3f3f3f3f3f3f3f3f3f3/checklist`)
                .set('Authorization', `Bearer ${token}`)
                .send({ text: 'Check oil' });
            expect(res.status).toBe(404);
        });

        it('adds, toggles, and deletes a checklist item', async () => {
            const { token } = await registerCompanyAdmin(server);
            const { toolId, scheduleId } = await createToolWithSchedule(token);

            const addRes = await request(server)
                .post(`/api/tools/${toolId}/schedules/${scheduleId}/checklist`)
                .set('Authorization', `Bearer ${token}`)
                .send({ text: 'Check oil' });
            expect(addRes.status).toBe(201);
            const itemId = addRes.body.schedule.checklist[0]._id;
            expect(addRes.body.schedule.checklist[0].done).toBe(false);

            const toggleRes = await request(server)
                .patch(`/api/tools/${toolId}/schedules/${scheduleId}/checklist/${itemId}`)
                .set('Authorization', `Bearer ${token}`);
            expect(toggleRes.status).toBe(200);
            expect(toggleRes.body.schedule.checklist[0].done).toBe(true);

            const deleteRes = await request(server)
                .delete(`/api/tools/${toolId}/schedules/${scheduleId}/checklist/${itemId}`)
                .set('Authorization', `Bearer ${token}`);
            expect(deleteRes.status).toBe(200);
            expect(deleteRes.body.schedule.checklist).toHaveLength(0);
        });

        it('returns 404 toggling a non-existent checklist item', async () => {
            const { token } = await registerCompanyAdmin(server);
            const { toolId, scheduleId } = await createToolWithSchedule(token);
            const res = await request(server)
                .patch(`/api/tools/${toolId}/schedules/${scheduleId}/checklist/64b7f3f3f3f3f3f3f3f3f3f3`)
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(404);
        });
    });
});
