import request from 'supertest';
import app from '../index';

/**
 * Programs endpoint integration tests.
 *
 * Response shapes (from programs.controller.ts):
 *   GET /api/programs  → { data: [...], pagination: { ... } }
 *   POST /api/programs → { program: { ... } }
 *   PUT  /api/programs/:id → { program: { ... } }
 *   DELETE /api/programs/:id → { message: '...' } or {}
 */

describe('Programs Endpoints', () => {
    let accessToken = '';
    let createdProgramId = 0;

    beforeAll(async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ username: 'nmtc-teshie', password: 'password' });

        accessToken = res.body.accessToken ?? '';
    });

    // ── GET /api/programs ─────────────────────────────────────────────
    describe('GET /api/programs', () => {
        it('should reject unauthenticated requests with 401', async () => {
            const res = await request(app).get('/api/programs');
            expect(res.status).toBe(401);
        });

        it('should return paginated program list when authenticated', async () => {
            const res = await request(app)
                .get('/api/programs')
                .set('Authorization', `Bearer ${accessToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body).toHaveProperty('pagination');
        });
    });

    // ── POST /api/programs ────────────────────────────────────────────
    describe('POST /api/programs', () => {
        it('should reject unauthenticated creation with 401', async () => {
            const res = await request(app)
                .post('/api/programs')
                .send({ name: 'Test', shortName: 'T', code: 'TCODE' });
            expect(res.status).toBe(401);
        });

        it('should create a new program', async () => {
            const uniqueCode = `TP${Date.now()}`;
            const res = await request(app)
                .post('/api/programs')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    name: 'Integration Test Program',
                    shortName: 'ITP',
                    code: uniqueCode,
                    status: 'ACTIVE',
                    maxTasks: 2,
                });

            expect([200, 201]).toContain(res.status);
            expect(res.body.program).toHaveProperty('id');
            createdProgramId = res.body.program.id;
        });
    });

    // ── PUT /api/programs/:id ─────────────────────────────────────────
    describe('PUT /api/programs/:id', () => {
        it('should reject unauthenticated update with 401', async () => {
            const res = await request(app)
                .put('/api/programs/1')
                .send({ status: 'DORMANT' });
            expect(res.status).toBe(401);
        });

        it('should set program status to DORMANT', async () => {
            if (!createdProgramId) return;

            const res = await request(app)
                .put(`/api/programs/${createdProgramId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ status: 'DORMANT' });

            expect([200, 201]).toContain(res.status);
            expect(res.body.program.status).toBe('DORMANT');
        });
    });

    // ── DELETE /api/programs/:id ──────────────────────────────────────
    describe('DELETE /api/programs/:id', () => {
        it('should reject unauthenticated delete with 401', async () => {
            const res = await request(app).delete('/api/programs/99999');
            expect(res.status).toBe(401);
        });

        it('should delete the created program', async () => {
            if (!createdProgramId) return;

            const res = await request(app)
                .delete(`/api/programs/${createdProgramId}`)
                .set('Authorization', `Bearer ${accessToken}`);

            expect([200, 204]).toContain(res.status);
        });
    });

    // ── Status filter ─────────────────────────────────────────────────
    describe('GET /api/programs — status filter', () => {
        it('should return only ACTIVE programs when filtered', async () => {
            const res = await request(app)
                .get('/api/programs?status=ACTIVE')
                .set('Authorization', `Bearer ${accessToken}`);

            expect(res.status).toBe(200);
            const programs = res.body.data ?? [];
            if (programs.length > 0) {
                expect(programs.every((p: { status: string }) => p.status === 'ACTIVE')).toBe(true);
            }
        });
    });
});
