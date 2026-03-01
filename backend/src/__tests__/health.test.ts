import request from 'supertest';
import app from '../index';

describe('Health Check', () => {
    it('GET /api/health should return status ok', async () => {
        const res = await request(app).get('/api/health');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('status', 'ok');
        expect(res.body).toHaveProperty('timestamp');
    });

    it('GET /nonexistent should return 404', async () => {
        const res = await request(app).get('/api/nonexistent-route');

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('error', 'Route not found');
    });
});
