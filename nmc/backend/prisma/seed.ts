import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/password';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seed...');

    // Create programs
    const programs = await Promise.all([
        prisma.program.upsert({
            where: { code: 'RGN' },
            update: {},
            create: {
                name: 'Registered General Nursing',
                shortName: 'RGN',
                code: 'RGN',
                status: 'ACTIVE',
            },
        }),
        prisma.program.upsert({
            where: { code: 'RMW' },
            update: {},
            create: {
                name: 'Registered Midwifery (PNNM)',
                shortName: 'Midwifery',
                code: 'RMW',
                status: 'ACTIVE',
            },
        }),
        prisma.program.upsert({
            where: { code: 'RCN' },
            update: {},
            create: {
                name: 'Registered Community Nursing',
                shortName: 'Community',
                code: 'RCN',
                status: 'ACTIVE',
            },
        }),
        prisma.program.upsert({
            where: { code: 'RMN' },
            update: {},
            create: {
                name: 'Registered Mental Nursing',
                shortName: 'Mental',
                code: 'RMN',
                status: 'ACTIVE',
            },
        }),
    ]);

    console.log('✅ Created programs:', programs.length);

    // Create admin user
    const adminPassword = await hashPassword('password');
    const admin = await prisma.user.upsert({
        where: { username: 'nmtc-teshie' },
        update: {
            passwordHash: adminPassword,
        },
        create: {
            name: 'Nursing And Midwifery Training School, Teshie',
            username: 'nmtc-teshie',
            email: 'Info@nmtcteshie.edu.gh',
            passwordHash: adminPassword,
            role: 'ADMINISTRATOR',
        },
    });

    console.log('✅ Created admin user:', admin.username);

    // Create examiner users
    const examinerPassword = await hashPassword('password');
    const examiners = await Promise.all([
        prisma.user.upsert({
            where: { username: 'AGYAATENG' },
            update: {
                passwordHash: examinerPassword,
            },
            create: {
                name: 'ALBERTA GYAATENG',
                username: 'AGYAATENG',
                email: 'AGYAATENG@GMAIL.COM',
                passwordHash: examinerPassword,
                role: 'EXAMINER',
            },
        }),
        prisma.user.upsert({
            where: { username: 'AKUARTEY' },
            update: {
                passwordHash: examinerPassword,
            },
            create: {
                name: 'ALBERTA KUARTEY',
                username: 'AKUARTEY',
                email: 'AKUARTEY@GMAIL.COM',
                passwordHash: examinerPassword,
                role: 'EXAMINER',
            },
        }),
    ]);

    console.log('✅ Created examiner users:', examiners.length);

    // Create sample students
    const midwiferyProgram = programs.find(p => p.code === 'RMW');
    const generalProgram = programs.find(p => p.code === 'RGN');
    const communityProgram = programs.find(p => p.code === 'RCN');

    if (midwiferyProgram && generalProgram && communityProgram) {
        const students = await Promise.all([
            prisma.student.upsert({
                where: { indexNo: '131012059' },
                update: {},
                create: {
                    indexNo: '131012059',
                    lastname: 'Armah',
                    othernames: 'Diana Naa Ayeley',
                    programId: midwiferyProgram.id,
                },
            }),
            prisma.student.upsert({
                where: { indexNo: '131013131' },
                update: {},
                create: {
                    indexNo: '131013131',
                    lastname: 'Meekaeel',
                    othernames: 'Hawah',
                    programId: midwiferyProgram.id,
                },
            }),
            prisma.student.upsert({
                where: { indexNo: '131013188' },
                update: {},
                create: {
                    indexNo: '131013188',
                    lastname: 'Opoku',
                    othernames: 'Gladys',
                    programId: midwiferyProgram.id,
                },
            }),
            prisma.student.upsert({
                where: { indexNo: '131014001' },
                update: {},
                create: {
                    indexNo: '131014001',
                    lastname: 'Mensah',
                    othernames: 'John',
                    programId: generalProgram.id,
                },
            }),
            prisma.student.upsert({
                where: { indexNo: '131014002' },
                update: {},
                create: {
                    indexNo: '131014002',
                    lastname: 'Addo',
                    othernames: 'Sarah',
                    programId: communityProgram.id,
                },
            }),
        ]);

        console.log('✅ Created students:', students.length);
    }

    // Create sample task
    if (midwiferyProgram) {
        const task = await prisma.task.upsert({
            where: { taskCode: 'T001' },
            update: {},
            create: {
                taskCode: 'T001',
                programId: midwiferyProgram.id,
                category: 'Basic Nursing',
                title: 'Checking Vital Signs - Temperature',
            },
        });

        // Create task procedures
        await Promise.all([
            prisma.taskProcedure.upsert({
                where: { taskId_stepNumber: { taskId: task.id, stepNumber: 1 } },
                update: {},
                create: {
                    taskId: task.id,
                    stepNumber: 1,
                    description: 'Wash hands and dry',
                    maxMarks: 2,
                },
            }),
            prisma.taskProcedure.upsert({
                where: { taskId_stepNumber: { taskId: task.id, stepNumber: 2 } },
                update: {},
                create: {
                    taskId: task.id,
                    stepNumber: 2,
                    description: 'Explain procedure to patient',
                    maxMarks: 3,
                },
            }),
            prisma.taskProcedure.upsert({
                where: { taskId_stepNumber: { taskId: task.id, stepNumber: 3 } },
                update: {},
                create: {
                    taskId: task.id,
                    stepNumber: 3,
                    description: 'Shake thermometer to below 35°C',
                    maxMarks: 5,
                },
            }),
        ]);

        console.log('✅ Created task with procedures');
    }

    console.log('🎉 Database seeding completed!');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
