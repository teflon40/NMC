const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); async function m() { console.log(await prisma.user.findMany()); } m();
