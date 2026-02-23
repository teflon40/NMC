import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findFirst();
    if (!user) {
        console.log('No user found to generate token for.');
        return;
    }

    const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role, status: user.status },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: '1h' }
    );

    console.log(token);
}

main().catch(console.error).finally(() => prisma.$disconnect());
