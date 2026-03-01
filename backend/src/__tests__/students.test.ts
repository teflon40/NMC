import request from 'supertest';
import app from '../index';

/**
 * Students endpoint integration tests.
 *
 * Uses a seeded admin credential (nmtc-teshie / password) to obtain
 * an access token for authenticated requests.
 *
 * Response shapes (from students.controller.ts):
 *   GET /api/students  → { students: [...], pagination: { ... } }
 *   POST /api/students → { student: { ... } }  (status 201)
 *   PUT  /api/students/:id → { student: { ... } }
 *   DELETE /api/students/:id → { message: '...' }
 */

describe('Students Endpoints', () => {
    let accessToken = '';
    let createdStudentId = 0;
    let testProgramId = 0;

    // ── Auth + shared data setup ──────────────────────────────────────
    beforeAll(async () => {
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({ username: 'nmtc-teshie', password: 'password' });

        accessToken = loginRes.body.accessToken ?? '';

        // Fetch first available programId for create tests
        const programsRes = await request(app)
            .get('/api/programs')
            .set('Authorization', `Bearer ${accessToken}`);

        // Controller returns { data: [...], pagination: {} }
        const programs = programsRes.body.data ?? programsRes.body.programs ?? [];
        testProgramId = programs?.[0]?.id ?? 0;
    });

    // ── GET /api/students ─────────────────────────────────────────────
    describe('GET /api/students', () => {
        it('should reject unauthenticated requests with 401', async () => {
            const res = await request(app).get('/api/students');
            expect(res.status).toBe(401);
        });

        it('should return paginated student list with valid token', async () => {
            const res = await request(app)
                .get('/api/students')
                .set('Authorization', `Bearer ${accessToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.students)).toBe(true);
            expect(res.body).toHaveProperty('pagination');
        });

        it('should support page & limit query params', async () => {
            const res = await request(app)
                .get('/api/students?page=1&limit=5')
                .set('Authorization', `Bearer ${accessToken}`);

            expect(res.status).toBe(200);
            expect(res.body.pagination.limit).toBe(5);
        });
    });

    // ── POST /api/students ────────────────────────────────────────────
    describe('POST /api/students', () => {
        it('should reject unauthenticated creation with 401', async () => {
            const res = await request(app)
                .post('/api/students')
                .send({ indexNo: 'TEST999', lastname: 'Test', othernames: 'User' });
            expect(res.status).toBe(401);
        });

        it('should create a new student', async () => {
            if (!testProgramId) return; // skip if no program available

            const res = await request(app)
                .post('/api/students')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    indexNo: `TEST${Date.now()}`,
                    lastname: 'Integration',
                    othernames: 'Test Student',
                    programId: testProgramId,
                });

            expect(res.status).toBe(201);
            expect(res.body.student).toHaveProperty('id');
            createdStudentId = res.body.student.id;
        });
    });

    // ── PUT /api/students/:id ─────────────────────────────────────────
    describe('PUT /api/students/:id', () => {
        it('should reject unauthenticated update with 401', async () => {
            const res = await request(app)
                .put('/api/students/1')
                .send({ lastname: 'Updated' });
            expect(res.status).toBe(401);
        });

        it('should update an existing student', async () => {
            if (!createdStudentId) return;

            const res = await request(app)
                .put(`/api/students/${createdStudentId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ lastname: 'UpdatedIntegration' });

            expect(res.status).toBe(200);
            expect(res.body.student.lastname).toBe('UpdatedIntegration');
        });
    });

    // ── DELETE /api/students/:id ──────────────────────────────────────
    describe('DELETE /api/students/:id', () => {
        it('should reject unauthenticated delete with 401', async () => {
            const res = await request(app).delete('/api/students/99999');
            expect(res.status).toBe(401);
        });

        it('should delete the created student', async () => {
            if (!createdStudentId) return;

            const res = await request(app)
                .delete(`/api/students/${createdStudentId}`)
                .set('Authorization', `Bearer ${accessToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message');
        });
    });
});
