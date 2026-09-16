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
        .send({ name: 'Excavator', ...overrides });
    return res.body;
}

// Creates a user in the admin's company, promotes them to `role`, logs them
// in and clears the forced first-login password change, returning a usable
// token. Mirrors the helper in fault.test.js.
async function createMember(adminToken, role) {
    const email = uniqueEmail(role);
    const createRes = await request(server)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `${role} User`, email, password: 'password123' });

    if (role !== 'operator') {
        await request(server)
            .patch(`/api/admin/users/${createRes.body._id}/role`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ role });
    }

    const loginRes = await request(server).post('/api/auth/login').send({ email, password: 'password123' });
    await request(server)
        .post('/api/auth/me/change-password')
        .set('Authorization', `Bearer ${loginRes.body.token}`)
        .send({ currentPassword: 'password123', newPassword: 'newpassword123', agreeToTerms: true });

    const freshLogin = await request(server).post('/api/auth/login').send({ email, password: 'newpassword123' });
    return { token: freshLogin.body.token, userId: createRes.body._id, email };
}

function listNotifications(token) {
    return request(server).get('/api/notifications').set('Authorization', `Bearer ${token}`);
}

describe('Notifications', () => {
    describe('fault reported fan-out', () => {
        it('notifies the company mechanics and admins when an operator reports a fault', async () => {
            const { token: adminToken } = await registerCompanyAdmin(server);
            const mechanic = await createMember(adminToken, 'mechanic');
            const operator = await createMember(adminToken, 'operator');
            const tool = await createTool(adminToken, { name: 'Bulldozer' });

            const faultRes = await request(server)
                .post('/api/faults')
                .set('Authorization', `Bearer ${operator.token}`)
                .send({ tool: tool._id, description: 'Hydraulic leak', code: 'H-12' });
            expect(faultRes.status).toBe(201);

            const mechanicFeed = await listNotifications(mechanic.token);
            expect(mechanicFeed.status).toBe(200);
            expect(mechanicFeed.body.notifications).toHaveLength(1);
            expect(mechanicFeed.body.unreadCount).toBe(1);

            const [notification] = mechanicFeed.body.notifications;
            expect(notification.type).toBe('fault_reported');
            expect(notification.title).toMatch(/Bulldozer/);
            expect(notification.body).toMatch(/Hydraulic leak/);
            expect(notification.body).toMatch(/H-12/);
            // Deep-links to the machine's fault tab, where a mechanic acts on it.
            expect(notification.link).toBe(`/equipment/${tool._id}?tab=faults`);
            expect(notification.readAt).toBeNull();

            const adminFeed = await listNotifications(adminToken);
            expect(adminFeed.body.notifications).toHaveLength(1);
        });

        it('does not notify operators, who have no fault queue to work', async () => {
            const { token: adminToken } = await registerCompanyAdmin(server);
            const bystander = await createMember(adminToken, 'operator');
            const reporter = await createMember(adminToken, 'operator');
            const tool = await createTool(adminToken);

            await request(server)
                .post('/api/faults')
                .set('Authorization', `Bearer ${reporter.token}`)
                .send({ tool: tool._id, description: 'Worn track' });

            const feed = await listNotifications(bystander.token);
            expect(feed.body.notifications).toHaveLength(0);
        });

        it('does not notify the reporter about their own fault', async () => {
            const { token: adminToken } = await registerCompanyAdmin(server);
            const mechanic = await createMember(adminToken, 'mechanic');
            const tool = await createTool(adminToken);

            await request(server)
                .post('/api/faults')
                .set('Authorization', `Bearer ${mechanic.token}`)
                .send({ tool: tool._id, description: 'Cracked bucket' });

            const ownFeed = await listNotifications(mechanic.token);
            expect(ownFeed.body.notifications).toHaveLength(0);

            // ...but the other staff member still hears about it.
            const adminFeed = await listNotifications(adminToken);
            expect(adminFeed.body.notifications).toHaveLength(1);
        });

        it('never leaks a fault notification across company boundaries', async () => {
            const { token: companyAToken } = await registerCompanyAdmin(server);
            const { token: companyBToken } = await registerCompanyAdmin(server);
            const tool = await createTool(companyAToken);

            const operator = await createMember(companyAToken, 'operator');
            await request(server)
                .post('/api/faults')
                .set('Authorization', `Bearer ${operator.token}`)
                .send({ tool: tool._id, description: 'Engine overheating' });

            const outsiderFeed = await listNotifications(companyBToken);
            expect(outsiderFeed.body.notifications).toHaveLength(0);
        });

        it('still creates the fault when there is nobody to notify', async () => {
            const { token: adminToken } = await registerCompanyAdmin(server);
            const tool = await createTool(adminToken);

            // The admin is the company's only staff member, and reporters are
            // excluded from their own notifications -- so the recipient set is
            // empty and the fault must still be created normally.
            const res = await request(server)
                .post('/api/faults')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ tool: tool._id, description: 'Flat tyre' });

            expect(res.status).toBe(201);
            expect(res.body.description).toBe('Flat tyre');
        });
    });

    describe('POST /api/notifications/announcements', () => {
        it('lets an admin broadcast to everyone in their company but themselves', async () => {
            const { token: adminToken } = await registerCompanyAdmin(server);
            const mechanic = await createMember(adminToken, 'mechanic');
            const operator = await createMember(adminToken, 'operator');

            const res = await request(server)
                .post('/api/notifications/announcements')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ title: 'Depot closed', body: 'The north depot is closed on Friday.' });

            expect(res.status).toBe(201);
            expect(res.body.recipients).toBe(2);

            for (const member of [mechanic, operator]) {
                const feed = await listNotifications(member.token);
                expect(feed.body.notifications).toHaveLength(1);
                expect(feed.body.notifications[0].type).toBe('announcement');
                expect(feed.body.notifications[0].title).toBe('Depot closed');
                expect(feed.body.notifications[0].sender).toMatchObject({ role: 'admin' });
            }

            const senderFeed = await listNotifications(adminToken);
            expect(senderFeed.body.notifications).toHaveLength(0);
        });

        it('can target a single role', async () => {
            const { token: adminToken } = await registerCompanyAdmin(server);
            const mechanic = await createMember(adminToken, 'mechanic');
            const operator = await createMember(adminToken, 'operator');

            const res = await request(server)
                .post('/api/notifications/announcements')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ title: 'Toolbox talk', body: 'Mechanics only, 8am.', roles: ['mechanic'] });

            expect(res.status).toBe(201);
            expect(res.body.recipients).toBe(1);
            expect((await listNotifications(mechanic.token)).body.notifications).toHaveLength(1);
            expect((await listNotifications(operator.token)).body.notifications).toHaveLength(0);
        });

        it('reaches only the sending admin\'s own company', async () => {
            const { token: companyAToken } = await registerCompanyAdmin(server);
            const { token: companyBToken } = await registerCompanyAdmin(server);
            await createMember(companyAToken, 'mechanic');

            await request(server)
                .post('/api/notifications/announcements')
                .set('Authorization', `Bearer ${companyAToken}`)
                .send({ title: 'Internal', body: 'Company A only.' });

            const outsiderFeed = await listNotifications(companyBToken);
            expect(outsiderFeed.body.notifications).toHaveLength(0);
        });

        it('rejects a non-admin sender', async () => {
            const { token: adminToken } = await registerCompanyAdmin(server);
            const mechanic = await createMember(adminToken, 'mechanic');

            const res = await request(server)
                .post('/api/notifications/announcements')
                .set('Authorization', `Bearer ${mechanic.token}`)
                .send({ title: 'Nope', body: 'Should not send.' });

            expect(res.status).toBe(403);
        });

        it('rejects a missing title or body', async () => {
            const { token } = await registerCompanyAdmin(server);
            await createMember(token, 'mechanic');

            const noTitle = await request(server)
                .post('/api/notifications/announcements')
                .set('Authorization', `Bearer ${token}`)
                .send({ body: 'Body only' });
            expect(noTitle.status).toBe(400);
            expect(noTitle.body.message).toMatch(/title is required/i);

            const noBody = await request(server)
                .post('/api/notifications/announcements')
                .set('Authorization', `Bearer ${token}`)
                .send({ title: 'Title only' });
            expect(noBody.status).toBe(400);
            expect(noBody.body.message).toMatch(/body is required/i);
        });

        it('rejects an unknown role and an empty role selection', async () => {
            const { token } = await registerCompanyAdmin(server);
            await createMember(token, 'mechanic');

            const unknown = await request(server)
                .post('/api/notifications/announcements')
                .set('Authorization', `Bearer ${token}`)
                .send({ title: 'T', body: 'B', roles: ['supervisor'] });
            expect(unknown.status).toBe(400);
            expect(unknown.body.message).toMatch(/unknown role/i);

            const empty = await request(server)
                .post('/api/notifications/announcements')
                .set('Authorization', `Bearer ${token}`)
                .send({ title: 'T', body: 'B', roles: [] });
            expect(empty.status).toBe(400);
            expect(empty.body.message).toMatch(/at least one role/i);
        });

        it('reports when no user matches the selected recipients', async () => {
            const { token } = await registerCompanyAdmin(server);
            // A brand new company has only its admin, who is excluded as sender.
            const res = await request(server)
                .post('/api/notifications/announcements')
                .set('Authorization', `Bearer ${token}`)
                .send({ title: 'Anyone there', body: 'Hello?' });

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/no users match/i);
        });
    });

    describe('reading the feed', () => {
        it('reports the unread count and clears it per notification', async () => {
            const { token: adminToken } = await registerCompanyAdmin(server);
            const mechanic = await createMember(adminToken, 'mechanic');
            await request(server)
                .post('/api/notifications/announcements')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ title: 'First', body: 'One' });
            await request(server)
                .post('/api/notifications/announcements')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ title: 'Second', body: 'Two' });

            const before = await request(server)
                .get('/api/notifications/unread-count')
                .set('Authorization', `Bearer ${mechanic.token}`);
            expect(before.body.unreadCount).toBe(2);

            const feed = await listNotifications(mechanic.token);
            const target = feed.body.notifications[0];

            const readRes = await request(server)
                .patch(`/api/notifications/${target._id}/read`)
                .set('Authorization', `Bearer ${mechanic.token}`);
            expect(readRes.status).toBe(200);
            expect(readRes.body.readAt).not.toBeNull();

            const after = await request(server)
                .get('/api/notifications/unread-count')
                .set('Authorization', `Bearer ${mechanic.token}`);
            expect(after.body.unreadCount).toBe(1);
        });

        it('marks everything read in one call', async () => {
            const { token: adminToken } = await registerCompanyAdmin(server);
            const mechanic = await createMember(adminToken, 'mechanic');
            await request(server)
                .post('/api/notifications/announcements')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ title: 'Bulk', body: 'One' });

            const res = await request(server)
                .post('/api/notifications/read-all')
                .set('Authorization', `Bearer ${mechanic.token}`);
            expect(res.status).toBe(200);
            expect(res.body.updated).toBe(1);

            const after = await request(server)
                .get('/api/notifications/unread-count')
                .set('Authorization', `Bearer ${mechanic.token}`);
            expect(after.body.unreadCount).toBe(0);
        });

        it('filters to unread only when asked', async () => {
            const { token: adminToken } = await registerCompanyAdmin(server);
            const mechanic = await createMember(adminToken, 'mechanic');
            await request(server)
                .post('/api/notifications/announcements')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ title: 'Keep', body: 'Unread' });
            await request(server)
                .post('/api/notifications/announcements')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ title: 'Drop', body: 'Will be read' });

            const feed = await listNotifications(mechanic.token);
            await request(server)
                .patch(`/api/notifications/${feed.body.notifications[0]._id}/read`)
                .set('Authorization', `Bearer ${mechanic.token}`);

            const unreadOnly = await request(server)
                .get('/api/notifications?unreadOnly=true')
                .set('Authorization', `Bearer ${mechanic.token}`);
            expect(unreadOnly.body.notifications).toHaveLength(1);
            expect(unreadOnly.body.notifications[0].title).toBe('Keep');
        });

        it('cannot mark someone else\'s notification read', async () => {
            const { token: adminToken } = await registerCompanyAdmin(server);
            const mechanic = await createMember(adminToken, 'mechanic');
            const other = await createMember(adminToken, 'operator');

            await request(server)
                .post('/api/notifications/announcements')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ title: 'For both', body: 'Hello', roles: ['mechanic'] });

            const feed = await listNotifications(mechanic.token);
            const notMine = feed.body.notifications[0]._id;

            const res = await request(server)
                .patch(`/api/notifications/${notMine}/read`)
                .set('Authorization', `Bearer ${other.token}`);
            expect(res.status).toBe(404);
        });

        it('is idempotent when re-reading an already-read notification', async () => {
            const { token: adminToken } = await registerCompanyAdmin(server);
            const mechanic = await createMember(adminToken, 'mechanic');
            await request(server)
                .post('/api/notifications/announcements')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ title: 'Once', body: 'Only' });

            const feed = await listNotifications(mechanic.token);
            const id = feed.body.notifications[0]._id;

            const first = await request(server)
                .patch(`/api/notifications/${id}/read`)
                .set('Authorization', `Bearer ${mechanic.token}`);
            const second = await request(server)
                .patch(`/api/notifications/${id}/read`)
                .set('Authorization', `Bearer ${mechanic.token}`);

            expect(second.status).toBe(200);
            // The original read timestamp is preserved, not bumped.
            expect(second.body.readAt).toBe(first.body.readAt);
        });

        it('rejects a malformed notification id', async () => {
            const { token } = await registerCompanyAdmin(server);
            const res = await request(server)
                .patch('/api/notifications/not-an-id/read')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(400);
        });

        it('requires authentication', async () => {
            expect((await request(server).get('/api/notifications')).status).toBe(401);
            expect((await request(server).get('/api/notifications/unread-count')).status).toBe(401);
        });
    });

    describe('DELETE /api/notifications/:id', () => {
        it('deletes an unread notification and decrements the unread count', async () => {
            const { token: adminToken } = await registerCompanyAdmin(server);
            const mechanic = await createMember(adminToken, 'mechanic');
            await request(server)
                .post('/api/notifications/announcements')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ title: 'Gone soon', body: 'Delete me' });

            const feed = await listNotifications(mechanic.token);
            const id = feed.body.notifications[0]._id;

            const del = await request(server)
                .delete(`/api/notifications/${id}`)
                .set('Authorization', `Bearer ${mechanic.token}`);
            expect(del.status).toBe(204);

            const after = await listNotifications(mechanic.token);
            expect(after.body.notifications.find(n => n._id === id)).toBeUndefined();
            expect(after.body.unreadCount).toBe(0);
        });

        it('cannot delete someone else\'s notification', async () => {
            const { token: adminToken } = await registerCompanyAdmin(server);
            const mechanic = await createMember(adminToken, 'mechanic');
            const other = await createMember(adminToken, 'operator');

            await request(server)
                .post('/api/notifications/announcements')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ title: 'For both', body: 'Hello', roles: ['mechanic'] });

            const feed = await listNotifications(mechanic.token);
            const notMine = feed.body.notifications[0]._id;

            const res = await request(server)
                .delete(`/api/notifications/${notMine}`)
                .set('Authorization', `Bearer ${other.token}`);
            expect(res.status).toBe(404);

            const stillThere = await listNotifications(mechanic.token);
            expect(stillThere.body.notifications.find(n => n._id === notMine)).toBeDefined();
        });

        it('rejects a malformed notification id', async () => {
            const { token } = await registerCompanyAdmin(server);
            const res = await request(server)
                .delete('/api/notifications/not-an-id')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(400);
        });

        it('requires authentication', async () => {
            const res = await request(server).delete('/api/notifications/507f1f77bcf86cd799439011');
            expect(res.status).toBe(401);
        });
    });

    describe('push subscriptions', () => {
        const subscription = {
            endpoint: 'https://push.example.com/endpoint-abc',
            keys: { p256dh: 'test-p256dh-key', auth: 'test-auth-secret' },
        };

        it('reports whether push is configured, so the client can hide the opt-in', async () => {
            const { token } = await registerCompanyAdmin(server);
            const res = await request(server)
                .get('/api/notifications/push/public-key')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            // No VAPID keys in the test environment: push is off, and the key
            // is empty rather than undefined.
            expect(res.body.enabled).toBe(false);
            expect(res.body.publicKey).toBe('');
        });

        it('registers a browser endpoint and is idempotent on re-subscribe', async () => {
            const { token } = await registerCompanyAdmin(server);
            const PushSubscription = require('../models/PushSubscription');

            const first = await request(server)
                .post('/api/notifications/push/subscriptions')
                .set('Authorization', `Bearer ${token}`)
                .send({ subscription });
            expect(first.status).toBe(201);

            const again = await request(server)
                .post('/api/notifications/push/subscriptions')
                .set('Authorization', `Bearer ${token}`)
                .send({ subscription });
            expect(again.status).toBe(201);

            // Re-subscribing the same browser must not duplicate the row, or
            // every notification would be delivered twice.
            const count = await PushSubscription.countDocuments({ endpoint: subscription.endpoint });
            expect(count).toBe(1);

            await PushSubscription.deleteMany({ endpoint: subscription.endpoint });
        });

        it('accepts a raw subscription body as well as a wrapped one', async () => {
            const { token } = await registerCompanyAdmin(server);
            const PushSubscription = require('../models/PushSubscription');
            const raw = { ...subscription, endpoint: 'https://push.example.com/endpoint-raw' };

            const res = await request(server)
                .post('/api/notifications/push/subscriptions')
                .set('Authorization', `Bearer ${token}`)
                .send(raw);
            expect(res.status).toBe(201);

            await PushSubscription.deleteMany({ endpoint: raw.endpoint });
        });

        it('rejects a subscription with no endpoint or keys', async () => {
            const { token } = await registerCompanyAdmin(server);

            const res = await request(server)
                .post('/api/notifications/push/subscriptions')
                .set('Authorization', `Bearer ${token}`)
                .send({ subscription: { endpoint: 'https://push.example.com/x' } });

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/endpoint and keys/i);
        });

        it('unsubscribes only the requesting user\'s own endpoint', async () => {
            const { token: ownerToken } = await registerCompanyAdmin(server);
            const { token: strangerToken } = await registerCompanyAdmin(server);
            const endpoint = 'https://push.example.com/endpoint-owned';

            await request(server)
                .post('/api/notifications/push/subscriptions')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ subscription: { ...subscription, endpoint } });

            const byStranger = await request(server)
                .delete('/api/notifications/push/subscriptions')
                .set('Authorization', `Bearer ${strangerToken}`)
                .send({ endpoint });
            expect(byStranger.body.removed).toBe(false);

            const byOwner = await request(server)
                .delete('/api/notifications/push/subscriptions')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ endpoint });
            expect(byOwner.body.removed).toBe(true);
        });
    });
});
