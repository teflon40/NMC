const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    const student = await prisma.student.findFirst();
    console.log('Student ID:', student ? student.id : 'NONE');
}

test().finally(() => prisma.$disconnect());
