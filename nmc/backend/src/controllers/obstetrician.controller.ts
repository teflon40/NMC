import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { randomUUID } from 'crypto';
import logger from '../utils/logger';
import { getContext } from './practical.controller';

export const submitObstetricianResult = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { studentId, examinerId, procedure, score, details } = req.body;

        if (!req.user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        const { academicYear, studentLevel } = await getContext(parseInt(studentId));

        // Check existing assessments for this student (obstetrician type)
        const existing = await prisma.examResult.findMany({
            where: {
                studentId: parseInt(studentId),
                examType: 'OBSTETRICIAN'
            },
            orderBy: { createdAt: 'asc' }
        });

        // Prevent more than 2 assessors
        if (existing.length >= 2) {
            res.status(400).json({ error: 'This student already has 2 obstetrician assessments. Cannot add more.' });
            return;
        }

        let assessorNumber: number;
        let reconciliationId: string;

        if (existing.length === 0) {
            assessorNumber = 1;
            reconciliationId = randomUUID();
        } else {
            if (existing[0].createdBy === req.user.userId) {
                res.status(400).json({
                    error: 'Examiner Conflict',
                    message: 'You have already submitted the first assessment for this student. A different examiner must perform the second assessment.'
                });
                return;
            }
            assessorNumber = 2;
            reconciliationId = existing[0].reconciliationId!;
        }

        const result = await prisma.examResult.create({
            data: {
                studentId: parseInt(studentId),
                examinerId: examinerId ? parseInt(examinerId) : null,
                createdBy: req.user.userId,
                examType: 'OBSTETRICIAN',
                procedure,
                score: parseFloat(score),
                details: details || {},
                academicYear,
                studentLevel,
                assessorNumber,
                reconciliationId
            },
            include: {
                student: true,
                examiner: true,
            },
        });

        // If second assessor, return both assessments for reconciliation
        if (assessorNumber === 2) {
            const bothAssessments = await prisma.examResult.findMany({
                where: { reconciliationId },
                include: {
                    student: { include: { program: true } },
                    examiner: true,
                    creator: { select: { id: true, name: true, username: true } }
                },
                orderBy: { assessorNumber: 'asc' }
            });
            res.status(201).json({ result, needsReconciliation: true, reconciliationId, assessments: bothAssessments });
        } else {
            res.status(201).json({ result, needsReconciliation: false });
        }
    } catch (error) {
        logger.error('Submit obstetrician result error:', { error });
        res.status(500).json({ error: 'Failed to submit result' });
    }
};

export const submitObstetricianFinalResult = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { reconciliationId } = req.params;
        const { selectedProcedures, reconciliationNotes } = req.body;

        if (!req.user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        // Get both assessments
        const assessments = await prisma.examResult.findMany({
            where: { reconciliationId: reconciliationId as string },
            orderBy: { assessorNumber: 'asc' }
        });

        if (assessments.length !== 2) {
            res.status(400).json({ error: 'Invalid reconciliation. Need exactly 2 assessments.' });
            return;
        }

        // Calculate total score from selected procedures
        const totalScore = selectedProcedures.reduce((sum: number, p: { score: number }) => sum + p.score, 0);

        // Create final submission
        const finalResult = await prisma.examResult.create({
            data: {
                studentId: assessments[0].studentId,
                createdBy: req.user.userId,
                examType: 'OBSTETRICIAN',
                procedure: 'Obstetrician Assessment (Reconciled)',
                score: totalScore,
                details: {
                    selectedProcedures,
                    reconciliationNotes,
                    originalAssessments: assessments.map(a => a.id)
                },
                academicYear: assessments[0].academicYear,
                studentLevel: assessments[0].studentLevel,
                isFinalSubmission: true,
                finalSubmittedBy: req.user.userId,
                reconciliationId: reconciliationId as string
            },
            include: {
                student: { include: { program: true } }
            }
        });

        res.json({ result: finalResult, message: 'Final result submitted successfully' });
    } catch (error) {
        logger.error('Submit obstetrician final result error:', { error });
        res.status(500).json({ error: 'Failed to submit final result' });
    }
};
