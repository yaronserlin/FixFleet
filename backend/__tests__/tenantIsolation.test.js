const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const path = require('path');
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key_minimum_32_characters_long';
process.env.MONGOMS_DOWNLOAD_DIR = path.join(__dirname, '../.mongo-binaries');

const app = require('../app');
let server;

jest.setTimeout(90000);

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

beforeAll(async () => {
    mongoServer = await createMongoMemoryServerWithRetry();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    server = app.listen(0);
}, 90000);

afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    if (mongoServer) {
        await mongoServer.stop();
    }
});

describe('Multi-Tenant SaaS Isolation & Security Tests', () => {
    let companyAToken;
    let companyACookie;
    let companyBToken;
    let companyBCookie;

    let toolAId;
    let toolBId;
    let faultAId;
    let partAId;
    let maintenanceAId;

    let companyAOperatorToken;

    // ── 1. Onboarding & Registration Isolation ──────────────────────
    describe('Company Onboarding & Auth Security', () => {
        it('registers Company A and creates first user as admin, ignoring client role', async () => {
            const res = await request(server)
                .post('/api/auth/register')
                .send({
                    companyName: 'Acme Corp',
                    name: 'Alice Admin',
                    email: 'alice@acme.com',
                    password: 'password123',
                    agreeToTerms: true,
                    role: 'operator', // Attempt privilege override or tampering
                });

            expect(res.status).toBe(201);
            expect(res.body.user.role).toBe('admin'); // Role forced to admin for creator
            expect(res.body.user.company.name).toBe('Acme Corp');
            expect(res.headers['set-cookie']).toBeDefined();

            companyAToken = res.body.token;
            companyACookie = res.headers['set-cookie'] && res.headers['set-cookie'][0];
            void companyACookie;
        });

        it('registers Company B independently with its own admin', async () => {
            const res = await request(server)
                .post('/api/auth/register')
                .send({
                    companyName: 'Beta Industries',
                    name: 'Bob Admin',
                    email: 'bob@beta.com',
                    password: 'password123',
                    agreeToTerms: true,
                });

            expect(res.status).toBe(201);
            expect(res.body.user.company.name).toBe('Beta Industries');

            companyBToken = res.body.token;
            companyBCookie = res.headers['set-cookie'][0];
        });

        it('enforces global email uniqueness across companies', async () => {
            const res = await request(server)
                .post('/api/auth/register')
                .send({
                    companyName: 'Duplicate Corp',
                    name: 'Fake Alice',
                    email: 'alice@acme.com',
                    password: 'password123',
                    agreeToTerms: true,
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/already exists/i);
        });

        it('authenticates and returns profile using Bearer auth', async () => {
            const res = await request(server)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${companyAToken}`);

            expect(res.status).toBe(200);
            expect(res.body.email).toBe('alice@acme.com');
            expect(res.body.company.name).toBe('Acme Corp');
        });

        it('rejects the same request with cookie-only auth (CSRF hardening)', async () => {
            const res = await request(server)
                .get('/api/auth/me')
                .set('Cookie', `accessToken=${companyAToken}`);

            expect(res.status).toBe(401);
        });
    });

    // ── 2. Tool Tenant Isolation ────────────────────────────────────
    describe('Tool Isolation', () => {
        it('Company A creates Tool A', async () => {
            const res = await request(server)
                .post('/api/tools')
                .set('Authorization', `Bearer ${companyAToken}`)
                .send({
                    name: 'Acme Laser Cutter',
                    serialNumber: 'ALC-001',
                    localSerialNumber: '101',
                    model: 'X-500',
                    description: 'Acme primary cutting tool',
                });

            expect(res.status).toBe(201);
            expect(res.body.name).toBe('Acme Laser Cutter');
            toolAId = res.body._id;
        });

        it('Company B creates Tool B', async () => {
            const res = await request(server)
                .post('/api/tools')
                .set('Authorization', `Bearer ${companyBToken}`)
                .send({
                    name: 'Beta Hydraulic Press',
                    serialNumber: 'BHP-900',
                    localSerialNumber: '202',
                    model: 'Press-9',
                });

            expect(res.status).toBe(201);
            expect(res.body.name).toBe('Beta Hydraulic Press');
            toolBId = res.body._id;
        });

        it('Company A only lists its own tools', async () => {
            const res = await request(server)
                .get('/api/tools')
                .set('Authorization', `Bearer ${companyAToken}`);

            expect(res.status).toBe(200);
            const toolNames = res.body.map(t => t.name);
            expect(toolNames).toContain('Acme Laser Cutter');
            expect(toolNames).not.toContain('Beta Hydraulic Press');
        });

        it('Company B cannot fetch Company A tool by ID (returns 404)', async () => {
            const res = await request(server)
                .get(`/api/tools/${toolAId}`)
                .set('Authorization', `Bearer ${companyBToken}`);

            expect(res.status).toBe(404);
        });

        it('Company B cannot update Company A tool (returns 404)', async () => {
            const res = await request(server)
                .put(`/api/tools/${toolAId}`)
                .set('Authorization', `Bearer ${companyBToken}`)
                .send({ name: 'Hacked Tool' });

            expect(res.status).toBe(404);
        });

        it('Company B cannot delete Company A tool (returns 404)', async () => {
            const res = await request(server)
                .delete(`/api/tools/${toolAId}`)
                .set('Authorization', `Bearer ${companyBToken}`);

            expect(res.status).toBe(404);
        });
    });

    // ── 3. Fault Tenant Isolation ───────────────────────────────────
    describe('Fault Isolation', () => {
        it('Company A creates a fault on Tool A', async () => {
            const res = await request(server)
                .post('/api/faults')
                .set('Authorization', `Bearer ${companyAToken}`)
                .send({
                    tool: toolAId,
                    code: 'ERR-01',
                    description: 'Laser alignment error',
                });

            expect(res.status).toBe(201);
            expect(res.body.description).toBe('Laser alignment error');
            faultAId = res.body._id;
        });

        it('Company B cannot log a fault referencing Company A tool', async () => {
            const res = await request(server)
                .post('/api/faults')
                .set('Authorization', `Bearer ${companyBToken}`)
                .send({
                    tool: toolAId, // Belongs to Acme
                    code: 'ERR-BOGUS',
                    description: 'Cross-tenant fault creation attempt',
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/does not exist in your organization/i);
        });

        it('Company B sees zero faults from Company A', async () => {
            const res = await request(server)
                .get('/api/faults')
                .set('Authorization', `Bearer ${companyBToken}`);

            expect(res.status).toBe(200);
            expect(res.body.length).toBe(0);
        });

        it('Company B cannot close Company A fault (returns 404)', async () => {
            const res = await request(server)
                .patch(`/api/faults/${faultAId}/close`)
                .set('Authorization', `Bearer ${companyBToken}`);

            expect(res.status).toBe(404);
        });

        it('Company B cannot delete Company A fault (returns 404)', async () => {
            const res = await request(server)
                .delete(`/api/faults/${faultAId}`)
                .set('Authorization', `Bearer ${companyBToken}`);

            expect(res.status).toBe(404);
        });
    });

    // ── 4. Part & Maintenance Tenant Isolation ──────────────────────
    describe('Part & Maintenance Isolation', () => {
        it('Company A creates a Part for Tool A', async () => {
            const res = await request(server)
                .post('/api/parts')
                .set('Authorization', `Bearer ${companyAToken}`)
                .send({
                    name: 'Laser Lens',
                    partNumber: 'LL-1',
                    tool: toolAId,
                    inStock: 4,
                });

            expect(res.status).toBe(201);
            partAId = res.body._id;
        });

        it('Company B cannot see Company A parts', async () => {
            const res = await request(server)
                .get('/api/parts')
                .set('Authorization', `Bearer ${companyBToken}`);

            expect(res.status).toBe(200);
            expect(res.body.length).toBe(0);
        });

        it('Company B cannot link a part to Company A tool', async () => {
            const res = await request(server)
                .post('/api/parts')
                .set('Authorization', `Bearer ${companyBToken}`)
                .send({
                    name: 'Illicit Part',
                    tool: toolAId,
                    inStock: 1,
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/does not exist in your organization/i);
        });

        it('Company A logs maintenance on Tool A', async () => {
            const res = await request(server)
                .post('/api/maintenance')
                .set('Authorization', `Bearer ${companyAToken}`)
                .send({
                    tool: toolAId,
                    details: 'Cleaned laser optics and recalibrated',
                });

            expect(res.status).toBe(201);
            maintenanceAId = res.body._id;
        });

        it('Company B cannot see Company A maintenance logs', async () => {
            const res = await request(server)
                .get('/api/maintenance')
                .set('Authorization', `Bearer ${companyBToken}`);

            expect(res.status).toBe(200);
            expect(res.body.length).toBe(0);
        });
    });

    // ── 5. User Management & Role Enforcement ───────────────────────
    describe('User Management & Role Isolation', () => {
        let companyAOperatorId;

        it('Company A admin creates an operator user', async () => {
            const res = await request(server)
                .post('/api/admin/users')
                .set('Authorization', `Bearer ${companyAToken}`)
                .send({
                    name: 'Aaron Operator',
                    email: 'aaron@acme.com',
                    password: 'password123',
                    role: 'operator',
                });

            expect(res.status).toBe(201);
            expect(res.body.role).toBe('operator');
            companyAOperatorId = res.body._id;

            // Log in as operator to get token
            const loginRes = await request(server)
                .post('/api/auth/login')
                .send({ email: 'aaron@acme.com', password: 'password123' });
            companyAOperatorToken = loginRes.body.token;
        });

        it('Company B admin list only shows Company B users', async () => {
            const res = await request(server)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${companyBToken}`);

            expect(res.status).toBe(200);
            const emails = res.body.map(u => u.email);
            expect(emails).toContain('bob@beta.com');
            expect(emails).not.toContain('alice@acme.com');
            expect(emails).not.toContain('aaron@acme.com');
        });

        it('Company B cannot modify Company A user role (returns 404)', async () => {
            const res = await request(server)
                .patch(`/api/admin/users/${companyAOperatorId}/role`)
                .set('Authorization', `Bearer ${companyBToken}`)
                .send({ role: 'admin' });

            expect(res.status).toBe(404);
        });

        it('Operator role cannot access admin routes (returns 403)', async () => {
            const res = await request(server)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${companyAOperatorToken}`);

            expect(res.status).toBe(403);
        });

        it('Operator role cannot mutate tools directly on /api/tools (returns 403 - Critical #2 Fix)', async () => {
            const res = await request(server)
                .post('/api/tools')
                .set('Authorization', `Bearer ${companyAOperatorToken}`)
                .send({ name: 'Unauthorized Tool' });

            expect(res.status).toBe(403);
        });

        it('Operator role cannot close faults (returns 403 - Finding #5 Fix)', async () => {
            const res = await request(server)
                .patch(`/api/faults/${faultAId}/close`)
                .set('Authorization', `Bearer ${companyAOperatorToken}`);

            expect(res.status).toBe(403);
        });

        it('Admin can reopen a closed fault', async () => {
            // First ensure it's closed
            await request(server)
                .patch(`/api/faults/${faultAId}/close`)
                .set('Authorization', `Bearer ${companyAToken}`)
                .send({ engineHours: 150 });

            // Reopen
            const reopenRes = await request(server)
                .put(`/api/faults/${faultAId}/reopen`)
                .set('Authorization', `Bearer ${companyAToken}`);

            expect(reopenRes.status).toBe(200);
            expect(reopenRes.body.status).toBe('open');
            expect(reopenRes.body.closingEngineHours).toBeUndefined();
        });

        it('GET /api/equipment returns equipment for Company A', async () => {
            const res = await request(server)
                .get('/api/equipment')
                .set('Authorization', `Bearer ${companyAToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
        });

        it('POST /api/equipment/:id/schedules creates schedule with checklist and persists it', async () => {
            const addRes = await request(server)
                .post(`/api/equipment/${toolAId}/schedules`)
                .set('Authorization', `Bearer ${companyAToken}`)
                .send({
                    title: '250hr Scheduled Inspection',
                    intervalHours: 250,
                    intervalDays: 30,
                    checklist: [
                        'Drain engine oil and inspect color',
                        'Replace primary cartridge filter',
                        'Check hydraulic fluid level',
                    ],
                });

            expect(addRes.status).toBe(201);
            const createdSchedule = addRes.body.maintenanceSchedule.find(s => s.title === '250hr Scheduled Inspection');
            expect(createdSchedule).toBeDefined();
            expect(createdSchedule.checklist).toHaveLength(3);
            expect(createdSchedule.checklist[0].text).toBe('Drain engine oil and inspect color');
            expect(createdSchedule.checklist[0].done).toBe(false);

            // Fetch via getSchedule endpoint
            const schedRes = await request(server)
                .get(`/api/equipment/${toolAId}/schedules/${createdSchedule._id}`)
                .set('Authorization', `Bearer ${companyAToken}`);

            expect(schedRes.status).toBe(200);
            expect(schedRes.body.schedule.checklist).toHaveLength(3);
            expect(schedRes.body.schedule.checklist[1].text).toBe('Replace primary cartridge filter');
        });

        it('PUT /api/faults/:id updates fault fields for Company A admin', async () => {
            const res = await request(server)
                .put(`/api/faults/${faultAId}`)
                .set('Authorization', `Bearer ${companyAToken}`)
                .send({
                    description: 'Updated fault description with new symptoms',
                    code: 'FLT-UPDATED-01',
                    engineHours: 1550,
                });

            expect(res.status).toBe(200);
            expect(res.body.description).toBe('Updated fault description with new symptoms');
            expect(res.body.code).toBe('FLT-UPDATED-01');
            expect(res.body.engineHours).toBe(1550);
        });

        it('PUT /api/faults/:id returns 403 for operator role', async () => {
            const res = await request(server)
                .put(`/api/faults/${faultAId}`)
                .set('Authorization', `Bearer ${companyAOperatorToken}`)
                .send({ description: 'Operator trying to edit fault' });

            expect(res.status).toBe(403);
        });

        it('PUT /api/faults/:id returns 404 for Company B (tenant isolation)', async () => {
            const res = await request(server)
                .put(`/api/faults/${faultAId}`)
                .set('Authorization', `Bearer ${companyBToken}`)
                .send({ description: 'Cross tenant modification' });

            expect(res.status).toBe(404);
        });

        it('Returns 400 when invalid nested ObjectId is supplied', async () => {
            const res = await request(server)
                .get(`/api/equipment/${toolAId}/schedules/invalid-schedule-id`)
                .set('Authorization', `Bearer ${companyAToken}`);

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/invalid scheduleId format/i);
        });

        it('GET /uploads/:filename enforces authentication', async () => {
            const res = await request(server).get('/uploads/test-manual.pdf');
            expect(res.status).toBe(401);
        });

        it('GET /uploads/:filename returns 404 for authenticated user when file does not exist', async () => {
            const res = await request(server)
                .get('/uploads/nonexistent-manual-12345.pdf')
                .set('Authorization', `Bearer ${companyAToken}`);

            expect(res.status).toBe(404);
        });
    });

    // ── 6. Health & System Check ────────────────────────────────────
    describe('Health Check Endpoint', () => {
        it('GET /api/health returns healthy', async () => {
            const res = await request(server).get('/api/health');
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('healthy');
            expect(res.body.database).toBe('connected');
        });
    });
});
