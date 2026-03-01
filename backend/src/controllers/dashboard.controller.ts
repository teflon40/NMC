import { Request, Response } from 'express';
import prisma from '../config/database';
import logger from '../utils/logger';

export const getDashboardStats = async (_req: Request, res: Response): Promise<void> => {
    try {
        const [
            totalStudents,
            totalExaminers,
            totalPrograms,
            recentResults
        ] = await Promise.all([
            prisma.student.count(),
            prisma.examiner.count(),
            prisma.program.count({ where: { status: 'ACTIVE' } }),
            prisma.examResult.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: {
                    student: { select: { indexNo: true, lastname: true } },
                    examiner: { select: { name: true } }
                }
            })
        ]);

        res.json({
            stats: {
                students: totalStudents,
                examiners: totalExaminers,
                programs: totalPrograms
            },
            recentActivity: recentResults
        });
    } catch (error) {
        logger.error('Dashboard stats error:', { error });
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
};
