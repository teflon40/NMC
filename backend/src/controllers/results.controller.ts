import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import logger from '../utils/logger';
import { getContext } from './practical.controller';

export const getAllResults = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { examType, studentId, includeAll } = req.query;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;

        const where: Record<string, unknown> = {};

        if (examType) {
            where.examType = examType as string;
        }

        if (studentId) {
            where.studentId = parseInt(studentId as string);
        }

        if (req.user?.role === 'EXAMINER') {
            where.createdBy = req.user.userId;
        }

        const [results, total] = await Promise.all([
            prisma.examResult.findMany({
                where,
                include: {
                    student: {
                        include: {
                            program: true
                        }
                    },
                    examiner: true,
                    task: { include: { procedures: { orderBy: { stepNumber: 'asc' } } } },
                    creator: { select: { id: true, name: true, username: true } }
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.examResult.count({ where })
        ]);

        // Filter out non-final dual-examiner results by default
        let filteredResults = results;
        if (!includeAll || includeAll !== 'true') {
            filteredResults = results.filter(r => {
                // If it has a reconciliationId, only show if it's the final submission
                if (r.reconciliationId) {
                    return r.isFinalSubmission;
                }
                return true;
            });
        }

        res.json({
            results: filteredResults,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        logger.error('Get results error:', { error });
        res.status(500).json({ error: 'Failed to get results' });
    }
};

export const getResultById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const result = await prisma.examResult.findUnique({
            where: { id: parseInt(id as string) },
            include: {
                student: {
                    include: {
                        program: true
                    }
                },
                examiner: true,
                task: {
                    include: {
                        procedures: true
                    }
                },
                creator: { select: { id: true, name: true, username: true } }
            },
        });

        if (!result) {
            res.status(404).json({ error: 'Result not found' });
            return;
        }

        res.json({ result });
    } catch (error) {
        logger.error('Get result by ID error:', { error });
        res.status(500).json({ error: 'Failed to get result' });
    }
};

export const submitCareStudyResult = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { studentId, examinerId, caseTitle, score, details } = req.body;

        if (!req.user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        const { academicYear, studentLevel } = await getContext(parseInt(studentId));

        const result = await prisma.examResult.create({
            data: {
                studentId: parseInt(studentId),
                examinerId: examinerId ? parseInt(examinerId) : null,
                createdBy: req.user.userId,
                examType: 'CARE_STUDY',
                caseTitle,
                score: parseFloat(score),
                details: details || {},
                academicYear,
                studentLevel
            },
            include: {
                student: true,
                examiner: true,
            },
        });

        res.status(201).json({ result });
    } catch (error) {
        logger.error('Submit care study result error:', { error });
        res.status(500).json({ error: 'Failed to submit result' });
    }
};

export const submitCarePlanResult = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { studentId, examinerId, diagnosis, score, details } = req.body;

        if (!req.user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        const { academicYear, studentLevel } = await getContext(parseInt(studentId));

        const result = await prisma.examResult.create({
            data: {
                studentId: parseInt(studentId),
                examinerId: examinerId ? parseInt(examinerId) : null,
                createdBy: req.user.userId,
                examType: 'CARE_PLAN',
                diagnosis,
                score: parseFloat(score),
                details: details || {},
                academicYear,
                studentLevel
            },
            include: {
                student: true,
                examiner: true,
            },
        });

        res.status(201).json({ result });
    } catch (error) {
        logger.error('Submit care plan result error:', { error });
        res.status(500).json({ error: 'Failed to submit result' });
    }
};

export const deleteResult = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const resultId = parseInt(id as string);

        const result = await prisma.examResult.findUnique({
            where: { id: resultId }
        });

        if (!result) {
            res.status(404).json({ error: 'Result not found' });
            return;
        }

        // Authorization: Only Admin or Creator can delete
        if (req.user?.role !== 'ADMINISTRATOR' && req.user?.role !== 'Administrator' && result.createdBy !== req.user?.userId) {
            res.status(403).json({ error: 'Not authorized to delete this result' });
            return;
        }

        // If part of a reconciliation group, delete ALL records in that group
        if (result.reconciliationId) {
            await prisma.examResult.deleteMany({
                where: { reconciliationId: result.reconciliationId }
            });
        } else {
            await prisma.examResult.delete({
                where: { id: resultId }
            });
        }

        res.json({ message: 'Result deleted successfully' });
    } catch (error) {
        logger.error('Delete result error:', { error });
        res.status(500).json({ error: 'Failed to delete result' });
    }
};
