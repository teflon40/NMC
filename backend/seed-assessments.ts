import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const assessmentTypes = [
    { code: 'PRACTICAL', name: 'Practical Exam', examinerCount: 2 },
    { code: 'CARE_PLAN', name: 'Care Plan', examinerCount: 1 },
    { code: 'CARE_STUDY', name: 'Care Study', examinerCount: 1 },
    { code: 'OBSTETRICIAN', name: 'Obstetrician', examinerCount: 1 },
];

async function main() {
    console.log('Seeding default assessment types...');
    for (const type of assessmentTypes) {
        const existing = await prisma.assessmentType.findUnique({
            where: { code: type.code }
        });

        if (!existing) {
            await prisma.assessmentType.create({
                data: type
            });
            console.log(`Created ${type.name}`);
        } else {
            console.log(`${type.name} already exists`);
        }
    }
    console.log('Finished seeding assessments.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
