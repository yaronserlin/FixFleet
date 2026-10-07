const request = require('supertest');
const bcrypt = require('bcrypt');
const {
    connectTestDB,
    closeTestDB,
    registerCompanyAdmin,
    uniqueEmail,
    extractRefreshToken,
} = require('./helpers/setup');

const app = require('../app');
const User = require('../models/User');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');

let server;
let superToken;
let superCookie;
let companyA;
let companyB;
let mechanicA;

jest.setTimeout(90000);

const asSuper = (req) => req.set('Authorization', `Bearer ${superToken}`);

async function addMember(adminToken, role) {
    const email = uniqueEmail(role);
    const created = await request(server)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `${role} user`, email, password: 'password123' });
    if (role !== 'operator') {
        await request(server)
            .patch(`/api/admin/users/${created.body._id}/role`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ role });
    }
    return { id: created.body._id, email };
}

beforeAll(async () => {
    await connectTestDB();
    server = app.listen(0);

    const email = uniqueEmail('super');
    await User.create({
        name: 'Platform Admin',
        email,
        role: 'superadmin',
        password: await bcrypt.hash('superpassword123', 4),
        companyId: null,
    });
    const login = await request(server).post('/api/auth/login').send({ email, password: 'superpassword123' });
    superToken = login.body.token;
    superCookie = login.headers['set-cookie'][0];

    companyA = await registerCompanyAdmin(server, { companyName: 'Alpha Farms' });
    companyB = await registerCompanyAdmin(server, { companyName: 'Beta Farms' });
    mechanicA = await addMember(companyA.token, 'mechanic');
    await addMember(companyB.token, 'operator');

    const equipment = await request(server)
        .post('/api/admin/equipment')
        .set('Authorization', `Bearer ${companyA.token}`)
        .send({ name: 'Alpha Tractor', serialNumber: 'ALPHA-001' });
    await request(server)
        .post('/api/faults')
        .set('Authorization', `Bearer ${companyA.token}`)
        .send({ tool: equipment.body._id, code: 'ERR-1', description: 'Leaking hydraulics' });
}, 90000);

afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
    await closeTestDB();
});

describe('superadmin authentication', () => {
    it('logs in without a company and can refresh', async () => {
        expect(superToken).toBeTruthy();
        const refresh = await request(server).post('/api/auth/refresh').set('Cookie', superCookie);
        expect(refresh.status).toBe(200);
        expect(extractRefreshToken(refresh.headers['set-cookie'])).toBeTruthy();
    });

    it('can read its own profile', async () => {
        const res = await asSuper(request(server).get('/api/auth/me'));
        expect(res.status).toBe(200);
        expect(res.body.role).toBe('superadmin');
    });

    it.each(['/api/equipment', '/api/faults', '/api/admin/users', '/api/notifications'])(
        'is refused on tenant route %s',
        async (path) => {
            const res = await asSuper(request(server).get(path));
            expect(res.status).toBe(403);
        }
    );
});

describe('tenant users cannot reach the platform API', () => {
    it('company admin gets 403 on /api/superadmin', async () => {
        const res = await request(server)
            .get('/api/superadmin/stats')
            .set('Authorization', `Bearer ${companyA.token}`);
        expect(res.status).toBe(403);
    });

    it('company admin cannot promote anyone to superadmin', async () => {
        const res = await request(server)
            .patch(`/api/admin/users/${mechanicA.id}/role`)
            .set('Authorization', `Bearer ${companyA.token}`)
            .send({ role: 'superadmin' });
        expect(res.status).toBe(400);
    });
});

describe('GET /api/superadmin/stats', () => {
    it('reports platform metrics only, across every company', async () => {
        const res = await asSuper(request(server).get('/api/superadmin/stats'));
        expect(res.status).toBe(200);
        expect(res.body.totals).toMatchObject({
            companies: 2,
            activeCompanies: 2,
            newCompaniesThisMonth: 2,
            users: 4,
            newUsersThisMonth: 4,
            // Only the two registering admins have signed in; added members haven't.
            activeUsers: 2,
            storageBytes: 0,
        });
        expect(res.body.totals).not.toHaveProperty('openFaults');
        expect(res.body.companiesPerMonth).toHaveLength(12);
        expect(res.body.companiesPerMonth[11].count).toBe(2);
        expect(res.body.usersPerMonth[11].count).toBe(4);
        expect(res.body.largestCompanies.map(c => c.users)).toEqual([2, 2]);
        expect(res.body.attention).toEqual({ inactiveCompanies: 0, dormantCompanies: 0, dormantSample: [] });
    });

    it('flags an active company where nobody has been active lately as dormant', async () => {
        await User.updateMany({ companyId: companyB.companyId }, { lastActiveAt: new Date('2020-01-01') });
        const res = await asSuper(request(server).get('/api/superadmin/stats'));
        expect(res.body.attention.dormantCompanies).toBe(1);
        expect(res.body.attention.dormantSample[0].name).toBe('Beta Farms');
        await User.updateMany({ companyId: companyB.companyId }, { lastActiveAt: new Date() });
    });
});

describe('company management', () => {
    it('lists companies with usage counts and filters by search', async () => {
        const res = await asSuper(request(server).get('/api/superadmin/companies?search=alpha'));
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0]).toMatchObject({ name: 'Alpha Farms', userCount: 2 });
        expect(res.body[0].lastActiveAt).toBeTruthy();
        expect(res.body[0]).not.toHaveProperty('openFaultCount');
    });

    it('returns one company with its users, without passwords', async () => {
        const res = await asSuper(request(server).get(`/api/superadmin/companies/${companyB.companyId}`));
        expect(res.status).toBe(200);
        expect(res.body.company.name).toBe('Beta Farms');
        expect(res.body.users).toHaveLength(2);
        expect(res.body.users[0].password).toBeUndefined();
    });

    it('rejects a non-boolean isActive', async () => {
        const res = await asSuper(request(server).patch(`/api/superadmin/companies/${companyB.companyId}/status`))
            .send({ isActive: 'no' });
        expect(res.status).toBe(400);
    });

    it('deactivating a company blocks its login, refresh and tokens; reactivating restores login', async () => {
        const off = await asSuper(request(server).patch(`/api/superadmin/companies/${companyB.companyId}/status`))
            .send({ isActive: false });
        expect(off.status).toBe(200);
        expect(off.body.isActive).toBe(false);

        const login = await request(server).post('/api/auth/login').send({ email: companyB.email, password: companyB.password });
        expect(login.status).toBe(403);
        const refresh = await request(server).post('/api/auth/refresh').set('Cookie', companyB.cookie);
        expect(refresh.status).toBe(403);
        const me = await request(server).get('/api/equipment').set('Authorization', `Bearer ${companyB.token}`);
        expect(me.status).toBe(403);

        await asSuper(request(server).patch(`/api/superadmin/companies/${companyB.companyId}/status`))
            .send({ isActive: true });
        const relogin = await request(server).post('/api/auth/login').send({ email: companyB.email, password: companyB.password });
        expect(relogin.status).toBe(200);
    });
});

describe('cross-company user management', () => {
    it('lists tenant users across companies, never superadmins', async () => {
        const res = await asSuper(request(server).get('/api/superadmin/users'));
        expect(res.status).toBe(200);
        expect(res.body.total).toBe(4);
        expect(res.body.users.every(u => u.role !== 'superadmin')).toBe(true);
        expect(res.body.users[0].companyId.name).toBeTruthy();
    });

    it('filters users by company and role', async () => {
        const res = await asSuper(
            request(server).get(`/api/superadmin/users?companyId=${companyA.companyId}&role=mechanic`)
        );
        expect(res.body.total).toBe(1);
        expect(res.body.users[0].email).toBe(mechanicA.email);
    });

    it('rejects an unknown role filter', async () => {
        const res = await asSuper(request(server).get('/api/superadmin/users?role=superadmin'));
        expect(res.status).toBe(400);
    });

    it('changes a role in another company', async () => {
        const res = await asSuper(request(server).patch(`/api/superadmin/users/${mechanicA.id}/role`))
            .send({ role: 'operator' });
        expect(res.status).toBe(200);
        expect(res.body.role).toBe('operator');
    });

    it('still refuses to demote or delete the last admin of a company', async () => {
        const demote = await asSuper(request(server).patch(`/api/superadmin/users/${companyA.userId}/role`))
            .send({ role: 'operator' });
        expect(demote.status).toBe(400);
        const del = await asSuper(request(server).delete(`/api/superadmin/users/${companyA.userId}`));
        expect(del.status).toBe(400);
    });

    it('cannot assign the superadmin role', async () => {
        const res = await asSuper(request(server).patch(`/api/superadmin/users/${mechanicA.id}/role`))
            .send({ role: 'superadmin' });
        expect(res.status).toBe(400);
    });

    it('cannot target a superadmin account', async () => {
        const other = await User.create({
            name: 'Other Super',
            email: uniqueEmail('super2'),
            role: 'superadmin',
            password: 'x',
            companyId: null,
        });
        const res = await asSuper(request(server).delete(`/api/superadmin/users/${other._id}`));
        expect(res.status).toBe(404);
    });

    it('resets a password to a one-time temporary password that forces a change', async () => {
        const res = await asSuper(request(server).post(`/api/superadmin/users/${mechanicA.id}/reset-password`));
        expect(res.status).toBe(200);
        expect(res.body.temporaryPassword).toEqual(expect.any(String));

        const login = await request(server)
            .post('/api/auth/login')
            .send({ email: mechanicA.email, password: res.body.temporaryPassword });
        expect(login.status).toBe(200);
        expect(login.body.user.mustChangePassword).toBe(true);
    });

    it('deletes a tenant user', async () => {
        const res = await asSuper(request(server).delete(`/api/superadmin/users/${mechanicA.id}`));
        expect(res.status).toBe(204);
        expect(await User.findById(mechanicA.id)).toBeNull();
    });
});

describe('POST /api/superadmin/announcements', () => {
    it('reaches users in every company, each notification scoped to its own company', async () => {
        const res = await asSuper(request(server).post('/api/superadmin/announcements'))
            .send({ title: 'Maintenance window', body: 'FixFleet will be down Sunday 02:00 UTC.' });
        expect(res.status).toBe(201);
        expect(res.body).toEqual({ recipients: 3, companies: 2 });

        const sent = await Notification.find({ title: 'Maintenance window' }).populate('recipient', 'companyId');
        expect(sent).toHaveLength(3);
        for (const n of sent) {
            expect(String(n.companyId)).toBe(String(n.recipient.companyId));
        }
    });

    it('narrows to selected companies and roles', async () => {
        const res = await asSuper(request(server).post('/api/superadmin/announcements')).send({
            title: 'Admins of Beta',
            body: 'Hello',
            companyIds: [String(companyB.companyId)],
            roles: ['admin'],
        });
        expect(res.status).toBe(201);
        expect(res.body).toEqual({ recipients: 1, companies: 1 });
    });

    it('validates the payload', async () => {
        const noTitle = await asSuper(request(server).post('/api/superadmin/announcements')).send({ body: 'x' });
        expect(noTitle.status).toBe(400);
        const badIds = await asSuper(request(server).post('/api/superadmin/announcements'))
            .send({ title: 't', body: 'b', companyIds: ['nope'] });
        expect(badIds.status).toBe(400);
    });
});

describe('audit log', () => {
    const logsFor = (query = '') => asSuper(request(server).get(`/api/superadmin/audit-logs${query}`));

    it('recorded company signups with the new admin as actor', async () => {
        const res = await logsFor(`?action=company.registered&companyId=${companyA.companyId}`);
        expect(res.status).toBe(200);
        expect(res.body.total).toBe(1);
        expect(res.body.logs[0]).toMatchObject({
            action: 'company.registered',
            actor: { email: companyA.email, role: 'admin' },
            target: { type: 'company', label: 'Alpha Farms' },
            companyId: { name: 'Alpha Farms' },
        });
    });

    it('recorded superadmin actions with before/after details', async () => {
        const role = await logsFor('?action=user.role_changed');
        expect(role.body.logs.some(l => l.metadata.from === 'mechanic' && l.metadata.to === 'operator' && l.actor.role === 'superadmin')).toBe(true);

        for (const action of ['company.deactivated', 'company.activated', 'user.password_reset', 'user.deleted', 'announcement.platform_sent', 'auth.superadmin_login']) {
            const res = await logsFor(`?action=${action}`);
            expect({ action, total: res.body.total > 0 }).toEqual({ action, total: true });
        }
    });

    it('recorded company-admin user management', async () => {
        const res = await logsFor(`?action=user.created&companyId=${companyA.companyId}`);
        expect(res.body.total).toBe(1);
        expect(res.body.logs[0].actor.email).toBe(companyA.email);
        expect(res.body.logs[0].target.label).toBe(mechanicA.email);
    });

    it('records failed logins without an actor, searchable by the attempted email', async () => {
        await request(server).post('/api/auth/login').send({ email: 'Intruder@Example.com', password: 'nope' });
        const res = await logsFor('?search=intruder@example.com');
        expect(res.body.total).toBe(1);
        expect(res.body.logs[0]).toMatchObject({ action: 'auth.login_failed', actor: null, metadata: { email: 'intruder@example.com' } });
        expect(res.body.logs[0].ip).toBeTruthy();
    });

    it('does not record ordinary tenant logins', async () => {
        const before = await AuditLog.countDocuments();
        await request(server).post('/api/auth/login').send({ email: companyA.email, password: companyA.password });
        expect(await AuditLog.countDocuments()).toBe(before);
    });

    it('rejects unknown filters and is superadmin-only', async () => {
        expect((await logsFor('?action=nope')).status).toBe(400);
        expect((await logsFor('?companyId=nope')).status).toBe(400);
        const tenant = await request(server).get('/api/superadmin/audit-logs').set('Authorization', `Bearer ${companyA.token}`);
        expect(tenant.status).toBe(403);
    });
});
