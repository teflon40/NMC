const axios = require('axios');
const fs = require('fs');

async function testReconciliation() {
    try {
        const api = axios.create({ baseURL: 'http://localhost:5000/api' });

        // 0. Register Examiners
        try {
            await api.post('/auth/register', { name: 'Abigail Tester', username: 'abigail@2023', email: 'abigail@test.com', password: 'password', role: 'EXAMINER' });
            await api.post('/auth/register', { name: 'Caleb Tester', username: 'caleb@2024', email: 'caleb@test.com', password: 'password', role: 'EXAMINER' });
            console.log("Examiners registered.");
        } catch (e) {
            console.log("Examiners might already exist.");
        }

        // 1. Login Examiner 1
        const login1 = await api.post('/auth/login', { username: 'abigail@2023', password: 'password' });
        const token1 = login1.data.token || login1.data.accessToken;
        console.log('Examiner 1 token fetched');

        // 2. Login Examiner 2
        const login2 = await api.post('/auth/login', { username: 'caleb@2024', password: 'password' });
        const token2 = login2.data.token || login2.data.accessToken;
        console.log('Examiner 2 token fetched');

        // MOCK DATA for Practical Exam
        const studentId = 1; // ID for student with index A520210007 (usually id 1)
        const taskId = 1;

        // 3. Submit Exam 1
        const res1 = await api.post('/results/practical/dual', {
            studentId, taskId, score: 75,
            details: { rawScores: { '1': 10, '2': 15, '3': 50 } }
        }, { headers: { Authorization: `Bearer ${token1}` } });
        console.log('Examiner 1 submitted. Needs Recon:', res1.data.needsReconciliation);

        // 4. Submit Exam 2
        const res2 = await api.post('/results/practical/dual', {
            studentId, taskId, score: 85,
            details: { rawScores: { '1': 12, '2': 18, '3': 55 } }
        }, { headers: { Authorization: `Bearer ${token2}` } });
        console.log('Examiner 2 submitted. Needs Recon:', res2.data.needsReconciliation);
        console.log('Reconciliation ID:', res2.data.result.reconciliationId);

        // 5. Fetch Reconciliation Data (simulate frontend)
        const recId = res2.data.result.reconciliationId;
        const recData = await api.get(`/results/reconciliation/${recId}`,
            { headers: { Authorization: `Bearer ${token1}` } });

        fs.writeFileSync('recon_test.json', JSON.stringify(recData.data, null, 2));
        console.log('Reconciliation data written to recon_test.json');

    } catch (e) {
        if (e.response && e.response.data) {
            console.error(e.response.data);
        } else {
            console.error(e.message);
        }
    }
}
testReconciliation();
