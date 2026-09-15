const request = require('supertest');
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

async function createTool(token, overrides = {}) {
    const res = await request(server)
        .post('/api/tools')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Tool', ...overrides });
    return res.body;
}

describe('Maintenance Controller', () => {
    describe('POST /api/maintenance (createMaintenance)', () => {
        it('rejects a request with no details', async () => {
            const { token } = await registerCompanyAdmin(server);
            const tool = await createTool(token);
            const res = await request(server)
                .post('/api/maintenance')
                .set('Authorization', `Bearer ${token}`)
                .send({ tool: tool._id });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/details are required/i);
        });

        it('rejects a request with no tool reference', async () => {
            const { token } = await registerCompanyAdmin(server);
            const res = await request(server)
                .post('/api/maintenance')
                .set('Authorization', `Bearer ${token}`)
                .send({ details: 'Replaced filter' });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/tool reference is required/i);
        });

        it('rejects a tool that does not belong to the company', async () => {
            const { token } = await registerCompanyAdmin(server);
            const res = await request(server)
                .post('/api/maintenance')
                .set('Authorization', `Bearer ${token}`)
                .send({ details: 'Replaced filter', tool: '64b7f3f3f3f3f3f3f3f3f3f3' });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/does not exist in your organization/i);
        });

        it('creates a maintenance record with an explicit date', async () => {
            const { token } = await registerCompanyAdmin(server);
            const tool = await createTool(token);
            const res = await request(server)
                .post('/api/maintenance')
                .set('Authorization', `Bearer ${token}`)
                .send({ tool: tool._id, details: 'Replaced filter', date: '2025-01-01' });
            expect(res.status).toBe(201);
            expect(res.body.details).toBe('Replaced filter');
            expect(res.body.tool._id).toBe(tool._id);
        });
    });

    describe('GET /api/maintenance (getAllMaintenance)', () => {
        it('filters by toolId and paginates', async () => {
            const { token } = await registerCompanyAdmin(server);
            const toolA = await createTool(token, { name: 'Tool A' });
            const toolB = await createTool(token, { name: 'Tool B' });
            await request(server).post('/api/maintenance').set('Authorization', `Bearer ${token}`)
                .send({ tool: toolA._id, details: 'A1' });
            await request(server).post('/api/maintenance').set('Authorization', `Bearer ${token}`)
                .send({ tool: toolA._id, details: 'A2' });
            await request(server).post('/api/maintenance').set('Authorization', `Bearer ${token}`)
                .send({ tool: toolB._id, details: 'B1' });

            const filtered = await request(server)
                .get(`/api/maintenance?toolId=${toolA._id}`)
                .set('Authorization', `Bearer ${token}`);
            expect(filtered.body.length).toBe(2);

            const paged = await request(server)
                .get('/api/maintenance?page=1&limit=1')
                .set('Authorization', `Bearer ${token}`);
            expect(paged.body.logs).toHaveLength(1);
            expect(paged.body.total).toBe(3);
            expect(paged.body.pages).toBe(3);
        });
    });

    describe('GET /api/maintenance/:id (getMaintenanceById)', () => {
        it('returns 404 for a non-existent record', async () => {
            const { token } = await registerCompanyAdmin(server);
            const res = await request(server)
                .get('/api/maintenance/64b7f3f3f3f3f3f3f3f3f3f3')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(404);
        });

        it('returns the record when found', async () => {
            const { token } = await registerCompanyAdmin(server);
            const tool = await createTool(token);
            const createRes = await request(server)
                .post('/api/maintenance')
                .set('Authorization', `Bearer ${token}`)
                .send({ tool: tool._id, details: 'Oil change' });

            const res = await request(server)
                .get(`/api/maintenance/${createRes.body._id}`)
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body.details).toBe('Oil change');
        });
    });

    describe('DELETE /api/maintenance/:id (deleteMaintenance)', () => {
        it('returns 404 for a non-existent record', async () => {
            const { token } = await registerCompanyAdmin(server);
            const res = await request(server)
                .delete('/api/maintenance/64b7f3f3f3f3f3f3f3f3f3f3')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(404);
        });

        it('deletes an existing record', async () => {
            const { token } = await registerCompanyAdmin(server);
            const tool = await createTool(token);
            const createRes = await request(server)
                .post('/api/maintenance')
                .set('Authorization', `Bearer ${token}`)
                .send({ tool: tool._id, details: 'Oil change' });

            const res = await request(server)
                .delete(`/api/maintenance/${createRes.body._id}`)
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);

            const getRes = await request(server)
                .get(`/api/maintenance/${createRes.body._id}`)
                .set('Authorization', `Bearer ${token}`);
            expect(getRes.status).toBe(404);
        });
    });
});
