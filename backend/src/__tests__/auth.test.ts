import request from 'supertest';
import app from '../index';

/**
 * Auth endpoint integration tests.
 *
 * These tests require a running PostgreSQL + Redis instance.
 * They exercise the real Prisma client and JWT logic.
 *
 * To run in isolation without side effects, use a separate test database
 * and seed/tear down data before each suite.
 */

describe('Auth Endpoints', () => {
    // ── Login ────────────────────────────────────────────────────────
    describe('POST /api/auth/login', () => {
        it('should reject missing credentials with 400', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({});

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'Validation Error');
            expect(res.body.details).toBeDefined();
        });

        it('should reject invalid credentials with 401', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ username: 'nonexistent_user_xyz', password: 'WrongPass1' });

            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty('error', 'Invalid credentials');
        });
    });

    // ── Register (requires auth) ─────────────────────────────────────
    describe('POST /api/auth/register', () => {
        it('should reject unauthenticated registration with 401', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Test User',
                    username: 'testuser',
                    email: 'test@example.com',
                    password: 'TestPass1',
                });

            expect(res.status).toBe(401);
        });
    });

    // ── Token Refresh ────────────────────────────────────────────────
    describe('POST /api/auth/refresh', () => {
        it('should reject missing refresh token with 400', async () => {
            const res = await request(app)
                .post('/api/auth/refresh')
                .send({});

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'Validation Error');
        });

        it('should reject invalid refresh token with 401', async () => {
            const res = await request(app)
                .post('/api/auth/refresh')
                .send({ refreshToken: 'invalid-token-string' });

            expect(res.status).toBe(401);
        });
    });

    // ── Protected endpoints without auth ─────────────────────────────
    describe('Protected routes without auth', () => {
        it('GET /api/auth/me should return 401 without token', async () => {
            const res = await request(app).get('/api/auth/me');
            expect(res.status).toBe(401);
        });

        it('GET /api/students should return 401 without token', async () => {
            const res = await request(app).get('/api/students');
            expect(res.status).toBe(401);
        });

        it('GET /api/programs should return 401 without token', async () => {
            const res = await request(app).get('/api/programs');
            expect(res.status).toBe(401);
        });

        it('GET /api/results should return 401 without token', async () => {
            const res = await request(app).get('/api/results');
            expect(res.status).toBe(401);
        });
    });

    // ── Validation tests ─────────────────────────────────────────────
    describe('Input Validation', () => {
        it('should reject login with empty username', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ username: '', password: 'SomePass1' });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'Validation Error');
        });

        it('should reject login with empty password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ username: 'admin', password: '' });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'Validation Error');
        });
    });

    // ── Full Auth Lifecycle ──────────────────────────────────────────
    describe('Full Auth Lifecycle', () => {
        const testUser = {
            username: `test_user_${Date.now()}`,
            password: 'TestPassword123!',
        };
        let accessToken = '';
        let refreshToken = '';
        let userId = 0;

        beforeAll(async () => {
            const { hashPassword } = await import('../utils/password');
            const { default: prisma } = await import('../config/database');
            const passwordHash = await hashPassword(testUser.password);
            const user = await prisma.user.create({
                data: {
                    name: 'API Test User',
                    username: testUser.username,
                    email: `${testUser.username}@example.com`,
                    passwordHash,
                    role: 'EXAMINER'
                }
            });
            userId = user.id;
        });

        afterAll(async () => {
            const { default: prisma } = await import('../config/database');
            await prisma.user.delete({ where: { id: userId } }).catch(() => { });
        });

        it('should login successfully', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ username: testUser.username, password: testUser.password });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('accessToken');
            expect(res.body).toHaveProperty('refreshToken');
            accessToken = res.body.accessToken;
            refreshToken = res.body.refreshToken;
        });

        it('should refresh token successfully', async () => {
            const res = await request(app)
                .post('/api/auth/refresh')
                .send({ refreshToken });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('accessToken');
        });

        it('should retrieve user profile with valid token', async () => {
            const res = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${accessToken}`);

            expect(res.status).toBe(200);
            expect(res.body.user).toHaveProperty('username', testUser.username);
        });

        it('should logout successfully (blacklist token)', async () => {
            const res = await request(app)
                .post('/api/auth/logout')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ refreshToken });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message', 'Logged out successfully');
        });

        it('should reject previously valid refresh token after logout', async () => {
            const res = await request(app)
                .post('/api/auth/refresh')
                .send({ refreshToken });

            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty('error', 'Token has been revoked');
        });
    });
});
