import prisma from '../config/database';

export const wipeService = {
    async executeWipe(wipeOptions: any, currentUserId: number) {
        // Using sequential raw deletes or grouped transactions to prevent locking issues
        // Order is important to respect foreign key constraints
        return await prisma.$transaction(async (tx) => {
            // 1. Delete all results and audits (safest leaf node)
            if (wipeOptions?.results || wipeOptions?.candidates || wipeOptions?.programs) {
                await tx.examResult.deleteMany();
                await tx.auditLog.deleteMany();
            }

            // 2. Delete all tasks and procedures
            if (wipeOptions?.tasks || wipeOptions?.programs) {
                await tx.taskProcedure.deleteMany();
                await tx.task.deleteMany();
            }

            // 3. Delete students
            if (wipeOptions?.candidates || wipeOptions?.programs) {
                await tx.student.deleteMany();
            }

            // 4. Delete examiners
            if (wipeOptions?.examiners || wipeOptions?.programs) {
                await tx.examiner.deleteMany();
            }

            // 5. Delete programs
            if (wipeOptions?.programs) {
                await tx.program.deleteMany();
            }

            // 6. Delete all users EXCEPT the currently logged-in one doing the wipe
            if (wipeOptions?.users) {
                await tx.user.deleteMany({
                    where: {
                        NOT: {
                            id: currentUserId
                        }
                    }
                });
            }

            return { success: true };
        }, {
            timeout: 30000 // 30 second timeout for massive deletions
        });
    }
};
