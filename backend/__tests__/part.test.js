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

describe('Part Controller', () => {
    describe('POST /api/parts (createPart)', () => {
        it('rejects a request with no name', async () => {
            const { token } = await registerCompanyAdmin(server);
            const res = await request(server)
                .post('/api/parts')
                .set('Authorization', `Bearer ${token}`)
                .send({ partNumber: 'PN-1' });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/part name is required/i);
        });

        it('rejects a tool reference that does not belong to the company', async () => {
            const { token } = await registerCompanyAdmin(server);
            const res = await request(server)
                .post('/api/parts')
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'Gasket', tool: '64b7f3f3f3f3f3f3f3f3f3f3' });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/does not exist in your organization/i);
        });

        it('creates a part without a tool reference', async () => {
            const { token } = await registerCompanyAdmin(server);
            const res = await request(server)
                .post('/api/parts')
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'Generic Gasket', inStock: 10 });
            expect(res.status).toBe(201);
            expect(res.body.name).toBe('Generic Gasket');
            expect(res.body.tool).toBeUndefined();
        });

        it('creates a part linked to a valid tool', async () => {
            const { token } = await registerCompanyAdmin(server);
            const tool = await createTool(token);
            const res = await request(server)
                .post('/api/parts')
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'Filter', tool: tool._id, inStock: 5 });
            expect(res.status).toBe(201);
            expect(res.body.tool).toBe(tool._id);
        });
    });

    describe('GET /api/parts (getAllParts)', () => {
        it('paginates results', async () => {
            const { token } = await registerCompanyAdmin(server);
            await request(server).post('/api/parts').set('Authorization', `Bearer ${token}`).send({ name: 'P1' });
            await request(server).post('/api/parts').set('Authorization', `Bearer ${token}`).send({ name: 'P2' });

            const res = await request(server)
                .get('/api/parts?page=1&limit=1')
                .set('Authorization', `Bearer ${token}`);
            expect(res.body.parts).toHaveLength(1);
            expect(res.body.total).toBe(2);
        });
    });

    describe('PUT /api/parts/:id (updatePart)', () => {
        it('rejects an empty name update', async () => {
            const { token } = await registerCompanyAdmin(server);
            const createRes = await request(server).post('/api/parts').set('Authorization', `Bearer ${token}`).send({ name: 'Part' });
            const res = await request(server)
                .put(`/api/parts/${createRes.body._id}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ name: '   ' });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/cannot be empty/i);
        });

        it('rejects an invalid tool reference', async () => {
            const { token } = await registerCompanyAdmin(server);
            const createRes = await request(server).post('/api/parts').set('Authorization', `Bearer ${token}`).send({ name: 'Part' });
            const res = await request(server)
                .put(`/api/parts/${createRes.body._id}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ tool: '64b7f3f3f3f3f3f3f3f3f3f3' });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/does not exist in your organization/i);
        });

        it('returns 404 for a non-existent part', async () => {
            const { token } = await registerCompanyAdmin(server);
            const res = await request(server)
                .put('/api/parts/64b7f3f3f3f3f3f3f3f3f3f3')
                .set('Authorization', `Bearer ${token}`)
                .send({ inStock: 3 });
            expect(res.status).toBe(404);
        });

        it('updates a part successfully', async () => {
            const { token } = await registerCompanyAdmin(server);
            const createRes = await request(server).post('/api/parts').set('Authorization', `Bearer ${token}`).send({ name: 'Part', inStock: 1 });
            const res = await request(server)
                .put(`/api/parts/${createRes.body._id}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'Updated Part', inStock: 9 });
            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Updated Part');
            expect(res.body.inStock).toBe(9);
        });
    });

    describe('DELETE /api/parts/:id (deletePart)', () => {
        it('returns 404 for a non-existent part', async () => {
            const { token } = await registerCompanyAdmin(server);
            const res = await request(server)
                .delete('/api/parts/64b7f3f3f3f3f3f3f3f3f3f3')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(404);
        });

        it('deletes a part successfully', async () => {
            const { token } = await registerCompanyAdmin(server);
            const createRes = await request(server).post('/api/parts').set('Authorization', `Bearer ${token}`).send({ name: 'Part' });
            const res = await request(server)
                .delete(`/api/parts/${createRes.body._id}`)
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
        });
    });
});
