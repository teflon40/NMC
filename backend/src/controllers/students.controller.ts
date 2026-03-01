import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const getAllStudents = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const skip = (page - 1) * limit;

        const search = req.query.search as string;
        const programId = req.query.programId ? parseInt(req.query.programId as string) : undefined;

        // Build the where clause for filtering
        const where: any = {
            deletedAt: null // Assuming we always want to hide soft-deleted
        };

        if (programId && !isNaN(programId)) {
            where.programId = programId;
        }

        if (search) {
            where.OR = [
                { indexNo: { contains: search, mode: 'insensitive' } },
                { lastname: { contains: search, mode: 'insensitive' } },
                { othernames: { contains: search, mode: 'insensitive' } }
            ];
        }

        const [total, students] = await prisma.$transaction([
            prisma.student.count({ where }),
            prisma.student.findMany({
                where,
                skip,
                take: limit,
                include: {
                    program: {
                        select: {
                            id: true,
                            name: true,
                            shortName: true,
                            code: true,
                            maxTasks: true,
                            maxCarePlans: true,
                        },
                    }
                },
                orderBy: {
                    createdAt: 'desc',
                },
            })
        ]);

        res.json({
            students,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get students error:', error);
        res.status(500).json({ error: 'Failed to get students' });
    }
};

export const getStudentById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const student = await prisma.student.findUnique({
            where: { id: parseInt(id as string) },
            include: {
                program: true,
                results: {
                    include: {
                        task: true,
                        examiner: true,
                    },
                },
            },
        });

        if (!student) {
            res.status(404).json({ error: 'Student not found' });
            return;
        }

        res.json({ student });
    } catch (error) {
        console.error('Get student error:', error);
        res.status(500).json({ error: 'Failed to get student' });
    }
};

export const createStudent = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { indexNo, lastname, othernames, programId } = req.body;

        // Check if student with index number already exists
        const existing = await prisma.student.findUnique({
            where: { indexNo },
        });

        if (existing) {
            res.status(400).json({ error: 'Student with this index number already exists' });
            return;
        }

        const student = await prisma.student.create({
            data: {
                indexNo,
                lastname,
                othernames,
                programId: parseInt(programId)
            },
            include: {
                program: true
            },
        });

        res.status(201).json({ student });
    } catch (error) {
        console.error('Create student error:', error);
        res.status(500).json({ error: 'Failed to create student' });
    }
};

export const updateStudent = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { indexNo, lastname, othernames, programId } = req.body;

        const student = await prisma.student.update({
            where: { id: parseInt(id as string) },
            data: {
                ...(indexNo && { indexNo }),
                ...(lastname && { lastname }),
                ...(othernames && { othernames }),
                ...(programId && { programId: parseInt(programId) })
            },
            include: {
                program: true
            },
        });

        res.json({ student });
    } catch (error) {
        console.error('Update student error:', error);
        res.status(500).json({ error: 'Failed to update student' });
    }
};

export const deleteStudent = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        await prisma.student.delete({
            where: { id: parseInt(id as string) }
        });

        res.json({ message: 'Student deleted successfully' });
    } catch (error) {
        console.error('Delete student error:', error);
        res.status(500).json({ error: 'Failed to delete student' });
    }
};

export const bulkCreateStudents = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { students } = req.body;

        if (!Array.isArray(students)) {
            res.status(400).json({ error: 'Students must be an array' });
            return;
        }

        const created = await prisma.student.createMany({
            data: students.map((s: any) => ({
                indexNo: s.indexNo,
                lastname: s.lastname,
                othernames: s.othernames,
                programId: parseInt(s.programId)
            })),
            skipDuplicates: true,
        });

        res.status(201).json({
            message: `Created ${created.count} students`,
            count: created.count
        });
    } catch (error) {
        console.error('Bulk create students error:', error);
        res.status(500).json({ error: 'Failed to create students' });
    }
};

export const promoteStudents = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { studentIds, newLevel } = req.body;

        if (!Array.isArray(studentIds) || !newLevel) {
            res.status(400).json({ error: 'Invalid request. Provide studentIds array and newLevel.' });
            return;
        }

        const updated = await prisma.student.updateMany({
            where: {
                id: { in: studentIds }
            },
            data: {
                level: newLevel
            }
        });

        // Log action
        // (Assuming auditService is imported or available, otherwise skip or import)

        res.json({
            message: `Promoted ${updated.count} students to ${newLevel}`,
            count: updated.count
        });
    } catch (error) {
        console.error('Promote students error:', error);
        res.status(500).json({ error: 'Failed to promote students' });
    }
};

export const getStudentTaskCompletion = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { studentId } = req.params;
        const id = Array.isArray(studentId) ? studentId[0] : studentId;

        if (!id) {
            res.status(400).json({ error: 'Student ID is required' });
            return;
        }

        const student = await prisma.student.findUnique({
            where: { id: parseInt(id) },
            include: { program: true }
        });

        const completion = await prisma.examResult.groupBy({
            by: ['examType'],
            where: {
                studentId: parseInt(id),
                isFinalSubmission: true,
                // deletedAt is omitted
            },
            _count: {
                id: true
            }
        });

        // Format into a more usable object
        const counts = {
            practical: 0,
            care_study: 0,
            care_plan: 0,
            obstetrician: 0,
            total: 0
        };

        type CountResult = {
            examType: string;
            _count: { id: number };
        };

        (completion as unknown as CountResult[]).forEach(c => {
            if (c.examType === 'PRACTICAL') counts.practical = c._count?.id || 0;
            else if (c.examType === 'CARE_STUDY') counts.care_study = c._count?.id || 0;
            else if (c.examType === 'CARE_PLAN') counts.care_plan = c._count?.id || 0;
            else if (c.examType === 'OBSTETRICIAN') counts.obstetrician = c._count?.id || 0;
        });

        counts.total = counts.practical + counts.care_study + counts.care_plan + counts.obstetrician;

        // The program object might not have maxTasks natively typed if it's deeply nested, but the schema has it. 
        // Cast to any for the maxTasks grab since it's a known schema property.
        const maxTasks = student && (student as any).program ? (student as any).program.maxTasks : 1;
        const maxCarePlans = student && (student as any).program ? (student as any).program.maxCarePlans : 1;

        res.json({
            counts,
            programMaxTasks: maxTasks || 1,
            programMaxCarePlans: maxCarePlans || 1
        });
    } catch (error) {
        console.error('Get student task completion error:', error);
        res.status(500).json({ error: 'Failed to get task completion' });
    }
};

export const bulkDeleteStudents = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            res.status(400).json({ error: 'An array of student IDs is required' });
            return;
        }

        const numericIds = ids.map((id: any) => parseInt(id)).filter((id: number) => !isNaN(id));

        const deleted = await prisma.student.deleteMany({
            where: { id: { in: numericIds } }
        });

        res.json({ message: `Deleted ${deleted.count} candidate${deleted.count === 1 ? '' : 's'}`, count: deleted.count });
    } catch (error) {
        console.error('Bulk delete students error:', error);
        res.status(500).json({ error: 'Failed to delete candidates' });
    }
};
