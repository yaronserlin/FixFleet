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

// Records are created by completing a schedule task -- the only path the app
// uses (POST /api/equipment/:id/schedules/:scheduleId/complete).
async function logService(token, toolId, details, currentEngineHours) {
    const addRes = await request(server)
        .post(`/api/tools/${toolId}/schedules`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: details, intervalHours: 100 });
    const scheduleId = addRes.body.maintenanceSchedule.at(-1)._id;
    await request(server)
        .post(`/api/tools/${toolId}/schedules/${scheduleId}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .send({ currentEngineHours });
}

async function listRecords(token, toolId) {
    const res = await request(server)
        .get(`/api/maintenance?toolId=${toolId}`)
        .set('Authorization', `Bearer ${token}`);
    return res.body;
}

describe('Maintenance Controller', () => {
    describe('GET /api/maintenance (getAllMaintenance)', () => {
        it('filters by toolId and paginates', async () => {
            const { token } = await registerCompanyAdmin(server);
            const toolA = await createTool(token, { name: 'Tool A' });
            const toolB = await createTool(token, { name: 'Tool B' });
            await logService(token, toolA._id, 'A1');
            await logService(token, toolA._id, 'A2');
            await logService(token, toolB._id, 'B1');

            expect(await listRecords(token, toolA._id)).toHaveLength(2);

            const paged = await request(server)
                .get('/api/maintenance?page=1&limit=1')
                .set('Authorization', `Bearer ${token}`);
            expect(paged.body.logs).toHaveLength(1);
            expect(paged.body.total).toBe(3);
            expect(paged.body.pages).toBe(3);
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
            await logService(token, tool._id, 'Oil change');
            const [record] = await listRecords(token, tool._id);

            const res = await request(server)
                .delete(`/api/maintenance/${record._id}`)
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(await listRecords(token, tool._id)).toHaveLength(0);
        });

        it('drops engine hours when the deleted record held the current reading', async () => {
            const { token } = await registerCompanyAdmin(server);
            const tool = await createTool(token);
            await logService(token, tool._id, 'First', 100);
            await logService(token, tool._id, 'Second', 300);
            const records = await listRecords(token, tool._id);
            const high = records.find((r) => r.engineHours === 300);

            await request(server)
                .delete(`/api/maintenance/${high._id}`)
                .set('Authorization', `Bearer ${token}`);
            const toolRes = await request(server)
                .get(`/api/tools/${tool._id}`)
                .set('Authorization', `Bearer ${token}`);
            expect(toolRes.body.currentEngineHours).toBe(100);
        });
    });
});
