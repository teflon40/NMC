const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    try {
        await prisma.examResult.create({
            data: {
                studentId: 1,
                createdBy: 11,
                examType: 'CARE_PLAN',
                diagnosis: 'RGN (Surgery)',
                score: 15,
                details: {},
            }
        });
        console.log('SUCCESS');
    } catch (e) {
        console.error('Prisma Error:', e.message);
    }
}

test().finally(() => prisma.$disconnect());
