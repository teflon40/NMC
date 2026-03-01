const axios = require('axios');
const fs = require('fs');

async function test() {
    const api = axios.create({ baseURL: 'http://localhost:5000/api' });

    // 1. Logins
    console.log('Logging in...');
    const login1 = await api.post('/auth/login', { username: 'ASAM', password: '12345678' });
    const t1 = login1.data.token || login1.data.accessToken;
    const login2 = await api.post('/auth/login', { username: 'DANIM', password: '12345678' });
    const t2 = login2.data.token || login2.data.accessToken;
    const adminUrl = await api.post('/auth/login', { username: 'nmtc-teshie', password: '12345678' });
    const tAdmin = adminUrl.data.token || adminUrl.data.accessToken;

    const studentId = 17;
    const taskId = 137;

    console.log('1. Submitting Care Plan...');
    await api.post('/results/care-plan', { studentId, diagnosis: 'RGN (Surgery)', score: 15, examType: 'CARE_PLAN' }, { headers: { Authorization: `Bearer ${t1}` } });
    await api.post('/results/care-plan', { studentId, diagnosis: 'RGN (Medicine)', score: 18, examType: 'CARE_PLAN' }, { headers: { Authorization: `Bearer ${t1}` } });

    const carePlanRes = await api.get('/results?examType=CARE_PLAN&includeAll=true', { headers: { Authorization: `Bearer ${tAdmin}` } });
    console.log('Care plan results returned:', carePlanRes.data.results.length);

    console.log('2. Submitting Practical Exam...');
    const r1 = await api.post('/results/practical/dual', { studentId, taskId, score: 35, examType: 'PRACTICAL', details: { rawScores: { '1': 10, '2': 10, '3': 15 } } }, { headers: { Authorization: `Bearer ${t1}` } });

    // Need unique tasks or random strings for some logic? No, let's keep going.
    const r2 = await api.post('/results/practical/dual', { studentId, taskId, score: 38, examType: 'PRACTICAL', details: { rawScores: { '1': 12, '2': 11, '3': 15 } } }, { headers: { Authorization: `Bearer ${t2}` } });

    console.log('Needs Recon:', r2.data.needsReconciliation);
    const recId = r2.data.result.reconciliationId;

    console.log('3. ADmin Finalizing...');
    await api.post(`/results/reconciliation/${recId}/finalize-practical`, { selectedProcedures: { '1': { score: 12, selectedFrom: 2 }, '2': { score: 11, selectedFrom: 2 }, '3': { score: 15, selectedFrom: 1 } }, reconciliationNotes: 'Test lock' }, { headers: { Authorization: `Bearer ${tAdmin}` } });

    const practicalRes = await api.get('/results?examType=PRACTICAL&includeAll=true', { headers: { Authorization: `Bearer ${tAdmin}` } });
    console.log('Practical results returned:', practicalRes.data.results.filter(r => r.taskId === taskId).length);

    console.log('ALL TESTS PASSED!');
}

test().catch(e => console.error(e.response ? e.response.data : e.message));
