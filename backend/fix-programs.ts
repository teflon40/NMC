import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Running script to update all programs to ACTIVE...');
    const result = await prisma.program.updateMany({
        where: {
            status: 'DORMANT'
        },
        data: {
            status: 'ACTIVE'
        }
    });

    console.log(`Successfully updated ${result.count} programs to ACTIVE.`);
    console.log('Clearing cache if Redis is configured...');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
