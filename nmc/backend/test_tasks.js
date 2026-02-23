const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    const task = await prisma.task.findFirst();
    console.log('Task ID:', task ? task.id : 'NONE');
}

test().finally(() => prisma.$disconnect());
