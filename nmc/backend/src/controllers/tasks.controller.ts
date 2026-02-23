import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const getAllTasks = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const programCode = req.query.programCode as string | undefined;

        const where = programCode
            ? { program: { code: programCode } }
            : {};

        // No limit — return every task in the system
        const tasks = await prisma.task.findMany({
            where,
            include: {
                procedures: { orderBy: { stepNumber: 'asc' } },
                program: { select: { name: true, code: true } }
            },
            orderBy: { title: 'asc' },
        });

        const formattedTasks = tasks.map(t => ({
            id: t.id.toString(),
            program: t.program.name,
            programCode: t.program.code,
            category: t.category,
            title: t.title,
            taskCode: t.taskCode,
            procedures: t.procedures.map(p => ({
                id: p.id.toString(),
                step: p.stepNumber,
                description: p.description,
                maxMarks: p.maxMarks
            }))
        }));

        res.json({ tasks: formattedTasks, total: formattedTasks.length });
    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({ error: 'Failed to get tasks' });
    }
};

export const getTaskById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const task = await prisma.task.findUnique({
            where: { id: parseInt(id as string) },
            include: {
                procedures: { orderBy: { stepNumber: 'asc' } },
                program: { select: { name: true, code: true } }
            }
        });

        if (!task) {
            res.status(404).json({ error: 'Task not found' });
            return;
        }

        res.json({
            task: {
                id: task.id.toString(),
                program: task.program.name,
                programCode: task.program.code,
                category: task.category,
                title: task.title,
                taskCode: task.taskCode,
                procedures: task.procedures.map(p => ({
                    id: p.id.toString(),
                    step: p.stepNumber,
                    description: p.description,
                    maxMarks: p.maxMarks
                }))
            }
        });
    } catch (error) {
        console.error('Get task error:', error);
        res.status(500).json({ error: 'Failed to get task' });
    }
};

export const createTask = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { program, category, title, taskCode, procedures } = req.body;

        const programRecord = await prisma.program.findFirst({
            where: { OR: [{ name: program }, { code: program }] }
        });

        if (!programRecord) {
            res.status(400).json({ error: 'db: Program not found' });
            return;
        }

        const finalTaskCode = taskCode || `T-${Date.now()}`;

        const task = await prisma.task.create({
            data: {
                programId: programRecord.id,
                category,
                title,
                taskCode: finalTaskCode,
                procedures: {
                    create: procedures.map((p: any) => ({
                        stepNumber: p.step,
                        description: p.description,
                        maxMarks: parseInt(p.maxMarks)
                    }))
                }
            },
            include: { procedures: true, program: true }
        });

        res.status(201).json({ task });
    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({ error: 'Failed to create task' });
    }
};

export const updateTask = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { program, category, title, procedures } = req.body;

        const programRecord = await prisma.program.findFirst({
            where: { OR: [{ name: program }, { code: program }] }
        });

        if (!programRecord) {
            res.status(400).json({ error: 'Program not found' });
            return;
        }

        const task = await prisma.$transaction(async (tx) => {
            const updated = await tx.task.update({
                where: { id: parseInt(id as string) },
                data: { programId: programRecord.id, category, title }
            });

            await tx.taskProcedure.deleteMany({ where: { taskId: parseInt(id as string) } });

            if (procedures && procedures.length > 0) {
                await tx.taskProcedure.createMany({
                    data: procedures.map((p: any) => ({
                        taskId: parseInt(id as string),
                        stepNumber: p.step,
                        description: p.description,
                        maxMarks: parseInt(p.maxMarks)
                    }))
                });
            }

            return updated;
        });

        res.json({ task });
    } catch (error) {
        console.error('Update task error:', error);
        res.status(500).json({ error: 'Failed to update task' });
    }
};

export const deleteTask = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        await prisma.task.delete({ where: { id: parseInt(id as string) } });
        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        console.error('Delete task error:', error);
        res.status(500).json({ error: 'Failed to delete task' });
    }
};

export const bulkDeleteTasks = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            res.status(400).json({ error: 'Requires an array of Task IDs.' });
            return;
        }

        const numIds = ids.map((id: any) => parseInt(id));
        const result = await prisma.task.deleteMany({ where: { id: { in: numIds } } });
        res.json({ message: `Successfully deleted ${result.count} tasks`, count: result.count });
    } catch (error) {
        console.error('Delete multiple tasks error:', error);
        res.status(500).json({ error: 'Failed to rapidly delete selected tasks' });
    }
};

// Bulk Import — supports appendMode (add procedures) and tracks duplicates
export const bulkImportTasks = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { tasks, appendMode = false } = req.body;

        const results = {
            success: 0,
            failed: 0,
            created: 0,
            updated: 0,
            duplicates: [] as string[], // titles that already existed
            errors: [] as string[]
        };

        for (const t of tasks) {
            try {
                const program = await prisma.program.findUnique({ where: { code: t.programCode } });

                if (!program) {
                    results.failed++;
                    results.errors.push(`Program code '${t.programCode}' not found for task '${t.title}'`);
                    continue;
                }

                let existingTask = null;
                if (t.taskCode) {
                    existingTask = await prisma.task.findUnique({ where: { taskCode: t.taskCode } });
                } else {
                    existingTask = await prisma.task.findFirst({
                        where: { programId: program.id, title: { equals: t.title, mode: 'insensitive' } }
                    });
                }

                if (existingTask) {
                    // Track as duplicate
                    results.duplicates.push(t.title);

                    if (appendMode) {
                        // Append: find the highest stepNumber and continue from there
                        const lastProc = await prisma.taskProcedure.findFirst({
                            where: { taskId: existingTask.id },
                            orderBy: { stepNumber: 'desc' }
                        });
                        const nextStep = (lastProc?.stepNumber ?? 0) + 1;

                        await prisma.taskProcedure.createMany({
                            data: t.procedures.map((p: any, i: number) => ({
                                taskId: existingTask!.id,
                                stepNumber: nextStep + i,
                                description: p.description,
                                maxMarks: p.maxMarks
                            }))
                        });
                    } else {
                        // Replace: delete and re-create
                        await prisma.taskProcedure.deleteMany({ where: { taskId: existingTask.id } });
                        await prisma.taskProcedure.createMany({
                            data: t.procedures.map((p: any) => ({
                                taskId: existingTask!.id,
                                stepNumber: p.step,
                                description: p.description,
                                maxMarks: p.maxMarks
                            }))
                        });
                        // Sync header fields
                        await prisma.task.update({
                            where: { id: existingTask.id },
                            data: { category: t.category, title: t.title }
                        });
                    }
                    results.updated++;
                } else {
                    // Brand-new task
                    await prisma.task.create({
                        data: {
                            programId: program.id,
                            category: t.category,
                            title: t.title,
                            taskCode: t.taskCode || `T-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                            procedures: {
                                create: t.procedures.map((p: any) => ({
                                    stepNumber: p.step,
                                    description: p.description,
                                    maxMarks: p.maxMarks
                                }))
                            }
                        }
                    });
                    results.created++;
                }

                results.success++;
            } catch (err: any) {
                console.error(`Error importing task ${t.title}:`, err);
                results.failed++;
                results.errors.push(`Error importing '${t.title}': ${err.message}`);
            }
        }

        res.json({ results });

    } catch (error) {
        console.error('Bulk import error:', error);
        res.status(500).json({ error: 'Failed to process bulk import' });
    }
};

