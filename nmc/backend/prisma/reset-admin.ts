import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/password';

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Resetting admin credentials...');

    try {
        const password = await hashPassword('password');

        const admin = await prisma.user.upsert({
            where: { username: 'nmtc-teshie' },
            update: {
                passwordHash: password,
                role: 'ADMINISTRATOR'
            },
            create: {
                name: 'Nursing And Midwifery Training School, Teshie',
                username: 'nmtc-teshie',
                email: 'Info@nmtcteshie.edu.gh',
                passwordHash: password,
                role: 'ADMINISTRATOR',
            },
        });

        console.log('✅ Admin user updated successfully!');
        console.log('👤 Username:', admin.username);
        console.log('🔑 Password: password');
        console.log('🆔 ID:', admin.id);

    } catch (e) {
        console.error('❌ Error updating admin:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
