import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { randomUUID } from 'crypto';
import logger from '../utils/logger';

// Helper to get current context (shared with other controllers)
export const getContext = async (studentId: number) => {
    const [yearSetting, student] = await Promise.all([
        prisma.systemSetting.findUnique({ where: { key: 'CURRENT_YEAR' } }),
        prisma.student.findUnique({ where: { id: studentId } })
    ]);
    return {
        academicYear: yearSetting?.value,
        studentLevel: student?.level
    };
};

// Dual Examiner: Submit assessment as Assessor 1 or 2
export const submitDualPracticalResult = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { studentId, examinerId, taskId, score, details } = req.body;

        if (!req.user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        const { academicYear, studentLevel } = await getContext(parseInt(studentId));

        // Fetch existing practical exams for this student to find specific task assessments
        const anyPracticalForStudent = await prisma.examResult.findMany({
            where: {
                studentId: parseInt(studentId),
                examType: 'PRACTICAL'
            },
            orderBy: { createdAt: 'asc' }
        });

        // Check existing assessments for this student/task
        const existing = anyPracticalForStudent.filter(
            r => r.taskId === (taskId ? parseInt(taskId) : null)
        );

        // Prevent more than 2 assessors
        if (existing.length >= 2) {
            res.status(400).json({ error: 'This student/task already has 2 assessments. Cannot add more.' });
            return;
        }

        let assessorNumber: number;
        let reconciliationId: string;

        if (existing.length === 0) {
            // First assessor
            assessorNumber = 1;
            reconciliationId = randomUUID();
        } else {
            // Second assessor - ensure it's a different examiner
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
                examType: 'PRACTICAL',
                taskId: taskId ? parseInt(taskId) : null,
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
                task: true,
            },
        });

        // If second assessor, return both assessments for reconciliation
        if (assessorNumber === 2) {
            const bothAssessments = await prisma.examResult.findMany({
                where: { reconciliationId },
                include: {
                    student: true,
                    examiner: true,
                    task: { include: { procedures: true } },
                    creator: { select: { id: true, name: true, username: true } }
                },
                orderBy: { assessorNumber: 'asc' }
            });
            res.status(201).json({ result, needsReconciliation: true, assessments: bothAssessments });
        } else {
            res.status(201).json({ result, needsReconciliation: false });
        }
    } catch (error) {
        logger.error('Submit dual practical result error:', { error });
        res.status(500).json({ error: 'Failed to submit result' });
    }
};

// Legacy single examiner endpoint (kept for backward compatibility)
export const submitPracticalResult = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { studentId, examinerId, taskId, score, details } = req.body;

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
                examType: 'PRACTICAL',
                taskId: taskId ? parseInt(taskId) : null,
                score: parseFloat(score),
                details: details || {},
                academicYear,
                studentLevel
            },
            include: {
                student: true,
                examiner: true,
                task: true,
            },
        });

        res.status(201).json({ result });
    } catch (error) {
        logger.error('Submit practical result error:', { error });
        res.status(500).json({ error: 'Failed to submit result' });
    }
};

// Submit final reconciled practical result (Procedure-level)
export const submitPracticalFinalResult = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { reconciliationId } = req.params;
        const { selectedProcedures, reconciliationNotes } = req.body;

        if (!req.user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        if (!selectedProcedures || Object.keys(selectedProcedures).length === 0) {
            res.status(400).json({ error: 'Selected procedures are required for reconciliation' });
            return;
        }

        // 1. Check if reconciliation already completed (locking mechanism)
        const existingFinal = await prisma.examResult.findFirst({
            where: {
                reconciliationId: reconciliationId as string,
                isFinalSubmission: true
            }
        });

        if (existingFinal) {
            res.status(400).json({
                error: 'Reconciliation already completed',
                message: 'This assessment has already been reconciled. Cannot submit duplicate reconciliation.'
            });
            return;
        }

        // 2. Get the original assessments to reference context
        const assessments = await prisma.examResult.findMany({
            where: { reconciliationId: reconciliationId as string },
            include: {
                task: { include: { procedures: true } },
                creator: { select: { name: true } }
            }
        });

        if (assessments.length === 0) {
            res.status(404).json({ error: 'Reconciliation session not found' });
            return;
        }


        const taskProcedures = (assessments[0] as any).task?.procedures || [];

        // Calculate new total score based on selections
        let totalScore = 0;
        let maxMarks = 0;

        const assessor1 = assessments.find(a => Number(a.assessorNumber) === 1);
        const assessor2 = assessments.find(a => Number(a.assessorNumber) === 2);

        const finalDetails: Record<string, unknown> = {
            procedures: {} as Record<string, unknown>,
            reconciled: true,
            assessor1Name: assessor1?.creator?.name || 'Unknown',
            assessor2Name: assessor2?.creator?.name || 'Unknown',
            originalAssessments: assessments.map(a => a.id)
        };

        const proceduresMap: Record<string, any> = {};
        const a1Scores = (assessor1?.details as any)?.procedureScores || {};
        const a2Scores = (assessor2?.details as any)?.procedureScores || {};

        taskProcedures.forEach((proc: { id: number; maxMarks: number; description: string; stepNumber: number }) => {
            const selection = selectedProcedures[proc.id];
            const score = selection ? Number(selection.score) : 0;
            const max = Number(proc.maxMarks);

            totalScore += score;
            maxMarks += max;

            const assessor1Score = a1Scores[proc.stepNumber];
            const assessor2Score = a2Scores[proc.stepNumber];

            proceduresMap[proc.id] = {
                score,
                maxMarks: max,
                selectedFrom: selection?.selectedFrom,
                description: proc.description,
                assessor1Score: assessor1Score !== undefined ? Number(assessor1Score) : null,
                assessor2Score: assessor2Score !== undefined ? Number(assessor2Score) : null
            };
        });

        finalDetails.procedures = proceduresMap;

        // Calculate percentage
        const percentageScore = maxMarks > 0 ? (totalScore / maxMarks) * 100 : 0;

        // 3. Create the FINAL exam result
        const finalResult = await prisma.examResult.create({
            data: {
                studentId: assessments[0].studentId,
                examinerId: null,
                createdBy: req.user.userId,
                examType: 'PRACTICAL',
                taskId: assessments[0].taskId,
                score: Math.round(percentageScore),
                details: {
                    ...finalDetails,
                    rawTotal: totalScore,
                    maxTotal: maxMarks
                },
                academicYear: assessments[0].academicYear,
                studentLevel: assessments[0].studentLevel,
                assessorNumber: 0,
                reconciliationId: reconciliationId as string,
                isFinalSubmission: true,
                finalSubmittedBy: req.user.userId,
                reconciliationNotes: reconciliationNotes || null
            }
        });

        res.status(201).json({ result: finalResult, message: 'Reconciliation completed successfully' });

    } catch (error) {
        logger.error('Submit practical final result error:', { error });
        res.status(500).json({ error: 'Failed to submit reconciled result' });
    }
};
