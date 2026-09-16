const request = require('supertest');
const { connectTestDB, closeTestDB, registerCompanyAdmin, uniqueEmail } = require('./helpers/setup');
const RefreshToken = require('../models/RefreshToken');
const crypto = require('crypto');

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

describe('Auth Controller', () => {
    describe('POST /api/auth/register', () => {
        it('rejects a company name shorter than 2 characters', async () => {
            const res = await request(server).post('/api/auth/register').send({
                companyName: 'A',
                name: 'Valid Name',
                email: uniqueEmail(),
                password: 'password123',
            });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/company name/i);
        });

        it('rejects a name shorter than 2 characters', async () => {
            const res = await request(server).post('/api/auth/register').send({
                companyName: 'Valid Co',
                name: 'A',
                email: uniqueEmail(),
                password: 'password123',
            });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/name must be/i);
        });

        it('rejects an invalid email format', async () => {
            const res = await request(server).post('/api/auth/register').send({
                companyName: 'Valid Co',
                name: 'Valid Name',
                email: 'not-an-email',
                password: 'password123',
            });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/valid email/i);
        });

        it('rejects a password shorter than 6 characters', async () => {
            const res = await request(server).post('/api/auth/register').send({
                companyName: 'Valid Co',
                name: 'Valid Name',
                email: uniqueEmail(),
                password: '123',
            });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/password must be/i);
        });

        it('rejects registration if terms of service and privacy policy are not accepted', async () => {
            const res = await request(server).post('/api/auth/register').send({
                companyName: 'Terms Co',
                name: 'Valid Name',
                email: uniqueEmail(),
                password: 'password123',
                agreeToTerms: false,
            });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/terms of service and privacy policy/i);
        });

        it('rejects duplicate slugs by generating a unique suffix', async () => {
            const first = await request(server).post('/api/auth/register').send({
                companyName: 'Slug Collision Co',
                name: 'First Admin',
                email: uniqueEmail(),
                password: 'password123',
                agreeToTerms: true,
            });
            expect(first.status).toBe(201);

            const second = await request(server).post('/api/auth/register').send({
                companyName: 'Slug Collision Co',
                name: 'Second Admin',
                email: uniqueEmail(),
                password: 'password123',
                agreeToTerms: true,
            });
            expect(second.status).toBe(201);
            expect(second.body.user.company.slug).not.toBe(first.body.user.company.slug);
            expect(second.body.user.termsAccepted).toBe(true);
        });

        it('forces the creator role to admin regardless of request body', async () => {
            const res = await request(server).post('/api/auth/register').send({
                companyName: 'Force Admin Co',
                name: 'Sneaky User',
                email: uniqueEmail(),
                password: 'password123',
                agreeToTerms: true,
                role: 'admin-override-attempt',
            });
            expect(res.status).toBe(201);
            expect(res.body.user.role).toBe('admin');
            expect(res.body.user.termsAccepted).toBe(true);
        });
    });

    describe('POST /api/auth/login', () => {
        it('rejects missing email or password', async () => {
            const res = await request(server).post('/api/auth/login').send({ email: 'x@x.com' });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/email and password/i);
        });

        it('rejects login for a non-existent email', async () => {
            const res = await request(server).post('/api/auth/login').send({
                email: 'nonexistent@example.com',
                password: 'password123',
            });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/invalid credentials/i);
        });

        it('rejects login with an incorrect password', async () => {
            const email = uniqueEmail();
            await registerCompanyAdmin(server, { email, password: 'correctPassword1' });

            const res = await request(server).post('/api/auth/login').send({
                email,
                password: 'wrongPassword',
            });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/invalid credentials/i);
        });

        it('logs in successfully with correct credentials', async () => {
            const email = uniqueEmail();
            await registerCompanyAdmin(server, { email, password: 'correctPassword1' });

            const res = await request(server).post('/api/auth/login').send({
                email,
                password: 'correctPassword1',
            });
            expect(res.status).toBe(200);
            expect(res.body.token).toBeDefined();
            expect(res.body.user.email).toBe(email);
        });
    });

    describe('POST /api/auth/logout', () => {
        it('clears the auth cookie and returns success', async () => {
            const res = await request(server).post('/api/auth/logout');
            expect(res.status).toBe(200);
            expect(res.body.message).toMatch(/logged out/i);
        });
    });

    describe('GET /api/auth/me', () => {
        it('rejects unauthenticated requests', async () => {
            const res = await request(server).get('/api/auth/me');
            expect(res.status).toBe(401);
        });

        it('returns the authenticated profile', async () => {
            const { token, email } = await registerCompanyAdmin(server);
            const res = await request(server)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(200);
            expect(res.body.email).toBe(email);
        });
    });

    describe('PUT /api/auth/me', () => {
        it('rejects an invalid name', async () => {
            const { token } = await registerCompanyAdmin(server);
            const res = await request(server)
                .put('/api/auth/me')
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'A', email: uniqueEmail() });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/name must be/i);
        });

        it('rejects an invalid email', async () => {
            const { token } = await registerCompanyAdmin(server);
            const res = await request(server)
                .put('/api/auth/me')
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'Valid Name', email: 'bad-email' });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/valid email/i);
        });

        it('requires the current password to change email address', async () => {
            const { token } = await registerCompanyAdmin(server);
            const res = await request(server)
                .put('/api/auth/me')
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'Valid Name', email: uniqueEmail() });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/current password is required/i);
        });

        it('rejects an incorrect current password when changing email', async () => {
            const { token } = await registerCompanyAdmin(server, { password: 'password123' });
            const res = await request(server)
                .put('/api/auth/me')
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'Valid Name', email: uniqueEmail(), currentPassword: 'wrongPassword' });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/current password is incorrect/i);
        });

        it('rejects an email already used by another user', async () => {
            const first = await registerCompanyAdmin(server);
            const second = await registerCompanyAdmin(server, { password: 'password123' });

            const res = await request(server)
                .put('/api/auth/me')
                .set('Authorization', `Bearer ${second.token}`)
                .send({ name: 'Valid Name', email: first.email, currentPassword: 'password123' });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/already in use/i);
        });

        it('updates the name without requiring a password when email is unchanged', async () => {
            const { token, email } = await registerCompanyAdmin(server);
            const res = await request(server)
                .put('/api/auth/me')
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'Updated Name', email });
            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Updated Name');
            expect(res.body.email).toBe(email);
        });

        it('updates the email successfully when the current password is correct', async () => {
            const { token } = await registerCompanyAdmin(server, { password: 'password123' });
            const newEmail = uniqueEmail();
            const res = await request(server)
                .put('/api/auth/me')
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'Updated Name', email: newEmail, currentPassword: 'password123' });
            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Updated Name');
            expect(res.body.email).toBe(newEmail);
        });
    });

    describe('POST /api/auth/me/avatar', () => {
        it('rejects a request with no file attached', async () => {
            const { token } = await registerCompanyAdmin(server);
            const res = await request(server)
                .post('/api/auth/me/avatar')
                .set('Authorization', `Bearer ${token}`);
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/avatar image file is required/i);
        });

        it('uploads an avatar image successfully', async () => {
            const { token } = await registerCompanyAdmin(server);
            const res = await request(server)
                .post('/api/auth/me/avatar')
                .set('Authorization', `Bearer ${token}`)
                .attach('avatar', Buffer.from([0x89, 0x50, 0x4e, 0x47]), {
                    filename: 'avatar.png',
                    contentType: 'image/png',
                });
            expect(res.status).toBe(200);
            expect(res.body.avatar).toMatch(/^\/uploads\/[a-f0-9]{24}$/);
        });

        it('rejects a disallowed file type', async () => {
            const { token } = await registerCompanyAdmin(server);
            const res = await request(server)
                .post('/api/auth/me/avatar')
                .set('Authorization', `Bearer ${token}`)
                .attach('avatar', Buffer.from('not an image'), {
                    filename: 'malware.exe',
                    contentType: 'application/x-msdownload',
                });
            expect(res.status).toBe(500);
            expect(res.body.message).toMatch(/only image files/i);
        });
    });

    describe('POST /api/auth/me/change-password', () => {
        it('rejects missing fields', async () => {
            const { token } = await registerCompanyAdmin(server);
            const res = await request(server)
                .post('/api/auth/me/change-password')
                .set('Authorization', `Bearer ${token}`)
                .send({ currentPassword: 'password123' });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/current and new password/i);
        });

        it('rejects a new password shorter than 6 characters', async () => {
            const { token } = await registerCompanyAdmin(server);
            const res = await request(server)
                .post('/api/auth/me/change-password')
                .set('Authorization', `Bearer ${token}`)
                .send({ currentPassword: 'password123', newPassword: '123' });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/new password must be/i);
        });

        it('rejects an incorrect current password', async () => {
            const { token } = await registerCompanyAdmin(server);
            const res = await request(server)
                .post('/api/auth/me/change-password')
                .set('Authorization', `Bearer ${token}`)
                .send({ currentPassword: 'wrongPassword', newPassword: 'newPassword1' });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/incorrect/i);
        });

        it('changes the password successfully and allows login with the new one', async () => {
            const email = uniqueEmail();
            const { token } = await registerCompanyAdmin(server, { email, password: 'password123' });

            const changeRes = await request(server)
                .post('/api/auth/me/change-password')
                .set('Authorization', `Bearer ${token}`)
                .send({ currentPassword: 'password123', newPassword: 'newPassword1' });
            expect(changeRes.status).toBe(200);

            const loginRes = await request(server).post('/api/auth/login').send({
                email,
                password: 'newPassword1',
            });
            expect(loginRes.status).toBe(200);
        });

        it('requires terms approval during first login forced password change', async () => {
            const { token: adminToken } = await registerCompanyAdmin(server);
            const userEmail = uniqueEmail('worker');
            const createRes = await request(server)
                .post('/api/admin/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'Worker Bob',
                    email: userEmail,
                    password: 'tempPassword123',
                });
            expect(createRes.status).toBe(201);
            expect(createRes.body.mustChangePassword).toBe(true);

            // Log in as worker Bob
            const loginRes = await request(server).post('/api/auth/login').send({
                email: userEmail,
                password: 'tempPassword123',
            });
            expect(loginRes.status).toBe(200);
            expect(loginRes.body.user.mustChangePassword).toBe(true);
            const workerToken = loginRes.body.token;

            // Attempt without agreeing to terms
            const noTermsRes = await request(server)
                .post('/api/auth/me/change-password')
                .set('Authorization', `Bearer ${workerToken}`)
                .send({
                    newPassword: 'myNewPersonalPass123',
                    agreeToTerms: false,
                });
            expect(noTermsRes.status).toBe(400);
            expect(noTermsRes.body.message).toMatch(/terms of service and privacy policy/i);
        });

        it('allows first login forced password change WITHOUT old password requirement when agreed to terms', async () => {
            const { token: adminToken } = await registerCompanyAdmin(server);
            const userEmail = uniqueEmail('worker');
            await request(server)
                .post('/api/admin/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'Worker Alice',
                    email: userEmail,
                    password: 'tempPassword123',
                });

            const loginRes = await request(server).post('/api/auth/login').send({
                email: userEmail,
                password: 'tempPassword123',
            });
            const workerToken = loginRes.body.token;

            // Submit new password without currentPassword
            const changeRes = await request(server)
                .post('/api/auth/me/change-password')
                .set('Authorization', `Bearer ${workerToken}`)
                .send({
                    newPassword: 'brandNewSecurePass123',
                    agreeToTerms: true,
                });
            expect(changeRes.status).toBe(200);
            expect(changeRes.body.mustChangePassword).toBe(false);
            expect(changeRes.body.termsAccepted).toBe(true);

            // Verify worker can log in with new password and mustChangePassword is false
            const nextLogin = await request(server).post('/api/auth/login').send({
                email: userEmail,
                password: 'brandNewSecurePass123',
            });
            expect(nextLogin.status).toBe(200);
            expect(nextLogin.body.user.mustChangePassword).toBe(false);
            expect(nextLogin.body.user.termsAccepted).toBe(true);
        });
    });

    describe('POST /api/auth/refresh', () => {
        it('rejects a request with no refresh token provided', async () => {
            const res = await request(server).post('/api/auth/refresh').send({});
            expect(res.status).toBe(401);
            expect(res.body.message).toMatch(/refresh token is required/i);
        });

        it('rejects an invalid or tampered refresh token', async () => {
            const res = await request(server)
                .post('/api/auth/refresh')
                .send({ refreshToken: 'invalid.token.signature' });
            expect(res.status).toBe(401);
            expect(res.body.message).toMatch(/invalid or expired/i);
        });

        it('refreshes token successfully via request body and rotates refresh token', async () => {
            const { refreshToken: initialRefreshToken } = await registerCompanyAdmin(server);
            expect(initialRefreshToken).toBeDefined();

            const refreshRes = await request(server)
                .post('/api/auth/refresh')
                .send({ refreshToken: initialRefreshToken });

            expect(refreshRes.status).toBe(200);
            expect(refreshRes.body.accessToken).toBeDefined();
            expect(refreshRes.body.token).toBeDefined();
            expect(refreshRes.body.refreshToken).toBeDefined();
            expect(refreshRes.body.refreshToken).not.toBe(initialRefreshToken);

            // New access token works to access protected route
            const meRes = await request(server)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${refreshRes.body.accessToken}`);
            expect(meRes.status).toBe(200);
        });

        it('refreshes token successfully via cookie', async () => {
            const { cookies } = await registerCompanyAdmin(server);
            expect(cookies).toBeDefined();

            // Find the refreshToken cookie
            const refreshCookie = cookies.find(c => c.startsWith('refreshToken='));
            expect(refreshCookie).toBeDefined();

            const refreshRes = await request(server)
                .post('/api/auth/refresh')
                .set('Cookie', [refreshCookie]);

            expect(refreshRes.status).toBe(200);
            expect(refreshRes.body.accessToken).toBeDefined();
            expect(refreshRes.body.refreshToken).toBeDefined();
        });

        it('tolerates near-simultaneous reuse of a just-rotated refresh token (concurrent-tab race)', async () => {
            // Regression test: multiple open browser tabs each independently
            // hold the app open, and each tab's access token expires at
            // roughly the same wall-clock moment (they were all minted at
            // login/registration together), so it's common for two tabs to
            // race to POST /auth/refresh within milliseconds of each other.
            // Refresh tokens are single-use, so the loser of that race
            // presents an already-rotated token -- this must NOT be treated
            // as a stolen/replayed token and must NOT log the user out of
            // every tab, or a real user hits this within a few hours of
            // normal multi-tab use (15-minute access token lifetime).
            const { refreshToken: initialRefreshToken } = await registerCompanyAdmin(server);

            const firstRefresh = await request(server)
                .post('/api/auth/refresh')
                .send({ refreshToken: initialRefreshToken });
            expect(firstRefresh.status).toBe(200);

            // A second, losing-the-race tab presents the same now-rotated
            // token moments later -- tolerated, not flagged as compromised.
            const racingReuse = await request(server)
                .post('/api/auth/refresh')
                .send({ refreshToken: initialRefreshToken });
            expect(racingReuse.status).toBe(200);
            expect(racingReuse.body.accessToken).toBeDefined();
            expect(racingReuse.body.refreshToken).toBeDefined();

            // Both tabs end up with independently valid, usable sessions --
            // neither the original refresh's nor the racing refresh's new
            // token was punished by family-wide revocation.
            const afterFirst = await request(server)
                .post('/api/auth/refresh')
                .send({ refreshToken: firstRefresh.body.refreshToken });
            expect(afterFirst.status).toBe(200);

            const afterRacing = await request(server)
                .post('/api/auth/refresh')
                .send({ refreshToken: racingReuse.body.refreshToken });
            expect(afterRacing.status).toBe(200);
        });

        it('still detects genuine reuse of a token rotated well outside the grace window', async () => {
            const { refreshToken: initialRefreshToken } = await registerCompanyAdmin(server);

            const firstRefresh = await request(server)
                .post('/api/auth/refresh')
                .send({ refreshToken: initialRefreshToken });
            expect(firstRefresh.status).toBe(200);

            // Simulate the rotation having happened well outside the grace
            // window (rather than sleeping in the test), by directly
            // backdating the revoked document's updatedAt.
            const hashed = crypto.createHash('sha256').update(initialRefreshToken).digest('hex');
            await RefreshToken.updateOne(
                { tokenHash: hashed },
                { updatedAt: new Date(Date.now() - 5 * 60 * 1000) },
                { timestamps: false } // otherwise Mongoose overwrites updatedAt with "now"
            );

            const staleReuseAttempt = await request(server)
                .post('/api/auth/refresh')
                .send({ refreshToken: initialRefreshToken });
            expect(staleReuseAttempt.status).toBe(403);
            expect(staleReuseAttempt.body.code).toBe('TOKEN_REUSE_DETECTED');

            // The whole family -- including the still-fresh rotated token
            // from the legitimate first refresh -- is revoked in response
            // to the genuine (stale) reuse.
            const attemptWithRotated = await request(server)
                .post('/api/auth/refresh')
                .send({ refreshToken: firstRefresh.body.refreshToken });
            expect(attemptWithRotated.status).toBe(403);
            expect(attemptWithRotated.body.code).toBe('TOKEN_REUSE_DETECTED');
        });

        it('revokes refresh token on logout', async () => {
            const { refreshToken } = await registerCompanyAdmin(server);

            const logoutRes = await request(server)
                .post('/api/auth/logout')
                .send({ refreshToken });
            expect(logoutRes.status).toBe(200);

            // Trying to refresh after logout should fail
            const refreshRes = await request(server)
                .post('/api/auth/refresh')
                .send({ refreshToken });
            expect(refreshRes.status).toBe(403);
        });

        it('revokes all active refresh tokens on password change', async () => {
            const email = uniqueEmail();
            const { token, refreshToken } = await registerCompanyAdmin(server, { email, password: 'oldPassword123' });

            const changeRes = await request(server)
                .post('/api/auth/me/change-password')
                .set('Authorization', `Bearer ${token}`)
                .send({ currentPassword: 'oldPassword123', newPassword: 'newPassword123' });
            expect(changeRes.status).toBe(200);

            // Refresh token issued before password change should now be revoked
            const refreshRes = await request(server)
                .post('/api/auth/refresh')
                .send({ refreshToken });
            expect(refreshRes.status).toBe(403);
        });
    });
});
