import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updatePrograms() {
    try {
        const result = await prisma.program.updateMany({
            data: {
                maxTasks: 2
            }
        });
        console.log(`Updated ${result.count} programs to have maxTasks = 2`);
    } catch (error) {
        console.error('Error updating programs:', error);
    } finally {
        await prisma.$disconnect();
    }
}

updatePrograms();
