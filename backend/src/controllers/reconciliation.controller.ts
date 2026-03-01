import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import logger from '../utils/logger';

// Admin: reset a completed reconciliation back to pending so examiners can redo it
export const resetReconciliation = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { reconciliationId } = req.params;

        if (!req.user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        // Get all rows for this reconciliation
        const allRows = await prisma.examResult.findMany({
            where: { reconciliationId: reconciliationId as string }
        });

        if (allRows.length === 0) {
            res.status(404).json({ error: 'Reconciliation not found' });
            return;
        }

        // The original two assessor rows have assessorNumber=1 or 2
        // The synthesized final practical row has assessorNumber=0 (created by submitPracticalFinalResult)
        // Synthesized final legacy rows might have assessorNumber=null
        // Delete the synthesized final row(s) so only the original 2 remain
        const finalRowIds = allRows
            .filter(r => r.assessorNumber === 0 || r.assessorNumber === null || r.assessorNumber === undefined)
            .map(r => r.id);

        if (finalRowIds.length > 0) {
            await prisma.examResult.deleteMany({
                where: { id: { in: finalRowIds } }
            });
        }

        // Reset the original assessor rows AND mark them ADMIN_RESET
        // so getPendingReconciliations knows to show them to examiners
        await prisma.examResult.updateMany({
            where: {
                reconciliationId: reconciliationId as string,
                assessorNumber: { in: [1, 2] }
            },
            data: {
                isFinalSubmission: false,
                finalSubmittedBy: null,
                reconciliationNotes: 'ADMIN_RESET',
            }
        });

        logger.info(`Admin ${req.user.userId} reset reconciliation ${reconciliationId} to pending`);
        res.json({ message: 'Reconciliation has been reset. Examiners can now redo it.' });
    } catch (error) {
        logger.error('Reset reconciliation error:', { error });
        res.status(500).json({ error: 'Failed to reset reconciliation' });
    }
};

// Get reconciliation data for comparison
export const getReconciliationData = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { reconciliationId } = req.params;

        const assessments = await prisma.examResult.findMany({
            where: { reconciliationId: reconciliationId as string },
            include: {
                student: { include: { program: true } },
                examiner: true,
                task: { include: { procedures: true } },
                creator: { select: { id: true, name: true, username: true } }
            },
            orderBy: { assessorNumber: 'asc' }
        });

        if (assessments.length === 0) {
            res.status(404).json({ error: 'Reconciliation not found' });
            return;
        }

        res.json({ assessments });
    } catch (error) {
        logger.error('Get reconciliation error:', { error });
        res.status(500).json({ error: 'Failed to get reconciliation data' });
    }
};

// Submit final result after reconciliation (non-practical, e.g. care study/plan)
export const submitFinalResult = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { reconciliationId } = req.params;
        const { selectedAssessorNumber, reconciliationNotes } = req.body;

        if (!req.user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        if (!selectedAssessorNumber || (selectedAssessorNumber !== 1 && selectedAssessorNumber !== 2)) {
            res.status(400).json({ error: 'Invalid assessor number. Must be 1 or 2.' });
            return;
        }

        // Find the selected assessment
        const selectedAssessment = await prisma.examResult.findFirst({
            where: {
                reconciliationId: reconciliationId as string,
                assessorNumber: selectedAssessorNumber
            }
        });

        if (!selectedAssessment) {
            res.status(404).json({ error: 'Selected assessment not found' });
            return;
        }

        // Mark as final submission
        const updated = await prisma.examResult.update({
            where: { id: selectedAssessment.id },
            data: {
                isFinalSubmission: true,
                finalSubmittedBy: req.user.userId,
                reconciliationNotes: reconciliationNotes || null
            },
            include: {
                student: true,
                examiner: true,
                task: true
            }
        });

        res.json({ result: updated, message: 'Final result submitted successfully' });
    } catch (error) {
        logger.error('Submit final result error:', { error });
        res.status(500).json({ error: 'Failed to submit final result' });
    }
};

// Get pending reconciliations
export const getPendingReconciliations = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        // Get all exam results that have a reconciliationId, are NOT final,
        // and were specifically flagged as ADMIN_RESET (to avoid showing all pending normal ones)
        const allAssessments = await prisma.examResult.findMany({
            where: {
                reconciliationId: { not: null },
                isFinalSubmission: false,
                reconciliationNotes: 'ADMIN_RESET'
            },
            include: {
                student: true,
                task: {
                    include: {
                        procedures: true
                    }
                },
                creator: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Group by reconciliationId
        const grouped = new Map<string, typeof allAssessments>();
        for (const assessment of allAssessments) {
            const recId = assessment.reconciliationId!;
            if (!grouped.has(recId)) {
                grouped.set(recId, []);
            }
            grouped.get(recId)!.push(assessment);
        }

        // Filter for groups with exactly 2 assessments AND no final submission yet
        const pending = [];
        for (const [reconciliationId, assessments] of grouped.entries()) {
            if (assessments.length === 2) {
                const hasFinal = await prisma.examResult.findFirst({
                    where: {
                        reconciliationId,
                        isFinalSubmission: true
                    }
                });

                if (!hasFinal) {
                    const isInvolved = assessments.some(a => a.createdBy === req.user!.userId);

                    if (isInvolved) {
                        pending.push({
                            reconciliationId,
                            student: assessments[0].student,
                            task: assessments[0].task,
                            assessments
                        });
                    }
                }
            }
        }

        res.json({ pending });
    } catch (error) {
        logger.error('Get pending reconciliations error:', { error });
        res.status(500).json({ error: 'Failed to get pending reconciliations' });
    }
};

// Get task status for a specific student (for dual examiner workflow)
export const getStudentTaskStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { studentId } = req.params;

        if (!req.user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        // Get all assessments for this student (practical exams only)
        const assessments = await prisma.examResult.findMany({
            where: {
                studentId: parseInt(studentId as string),
                examType: 'PRACTICAL',
                taskId: { not: null }
            },
            include: {
                task: true,
                creator: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Group by reconciliationId (or taskId for single assessments)
        const taskStatusMap = new Map<string, {
            taskId: number;
            taskTitle: string;
            status: 'in_progress' | 'pending_reconciliation' | 'finalized';
            assessmentCount: number;
            assessors: string[];
            reconciliationId?: string;
            isFinal: boolean;
        }>();

        for (const assessment of assessments) {
            const taskId = assessment.taskId!;
            const key = assessment.reconciliationId || `single_${taskId}`;

            if (!taskStatusMap.has(key)) {
                taskStatusMap.set(key, {
                    taskId,
                    taskTitle: assessment.task?.title || 'Unknown Task',
                    status: 'in_progress',
                    assessmentCount: 0,
                    assessors: [],
                    reconciliationId: assessment.reconciliationId || undefined,
                    isFinal: false
                });
            }

            const status = taskStatusMap.get(key)!;
            status.assessmentCount++;

            if (assessment.creator?.name && !status.assessors.includes(assessment.creator.name)) {
                status.assessors.push(assessment.creator.name);
            }

            if (assessment.isFinalSubmission) {
                status.isFinal = true;
                status.status = 'finalized';
            } else if (status.assessmentCount >= 2 && !status.isFinal) {
                status.status = 'pending_reconciliation';
            }
        }

        const taskStatus = Array.from(taskStatusMap.values());
        res.json({ taskStatus });
    } catch (error) {
        logger.error('Get student task status error:', { error });
        res.status(500).json({ error: 'Failed to fetch task status' });
    }
};
