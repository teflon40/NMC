import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

// GET /api/assessment-types
export const getAllAssessmentTypes = async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
        const types = await prisma.assessmentType.findMany({
            orderBy: { name: 'asc' },
            include: {
                programLinks: {
                    include: {
                        program: {
                            select: { id: true, name: true, code: true }
                        }
                    }
                }
            }
        });
        res.json({ assessmentTypes: types });
    } catch (error) {
        console.error('Get assessment types error:', error);
        res.status(500).json({ error: 'Failed to get assessment types' });
    }
};

// POST /api/assessment-types
export const createAssessmentType = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { name, code, examinerCount, isActive, programIds } = req.body;

        if (!name || !code) {
            res.status(400).json({ error: 'Name and code are required' });
            return;
        }

        const assessmentType = await prisma.assessmentType.create({
            data: {
                name: name.trim(),
                code: code.trim().toUpperCase().replace(/\s+/g, '_'),
                examinerCount: examinerCount ?? 1,
                isActive: isActive ?? true,
                programLinks: {
                    create: Array.isArray(programIds)
                        ? programIds.map((pid: number) => ({ programId: pid }))
                        : []
                }
            },
            include: {
                programLinks: {
                    include: {
                        program: { select: { id: true, name: true, code: true } }
                    }
                }
            }
        });

        res.status(201).json({ assessmentType });
    } catch (error: any) {
        if (error.code === 'P2002') {
            res.status(400).json({ error: 'An assessment type with that name or code already exists' });
            return;
        }
        console.error('Create assessment type error:', error);
        res.status(500).json({ error: 'Failed to create assessment type' });
    }
};

// PUT /api/assessment-types/:id
export const updateAssessmentType = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { name, code, examinerCount, isActive, programIds } = req.body;

        // Replace all program links using a transaction
        const assessmentType = await prisma.$transaction(async (tx) => {
            // Delete existing links
            await tx.assessmentTypeProgram.deleteMany({
                where: { assessmentTypeId: parseInt(id as string) }
            });

            // Update the type and recreate program links
            return tx.assessmentType.update({
                where: { id: parseInt(id as string) },
                data: {
                    name: name?.trim(),
                    code: code?.trim().toUpperCase().replace(/\s+/g, '_'),
                    examinerCount: examinerCount ?? 1,
                    isActive: isActive ?? true,
                    programLinks: {
                        create: Array.isArray(programIds)
                            ? programIds.map((pid: number) => ({ programId: pid }))
                            : []
                    }
                },
                include: {
                    programLinks: {
                        include: {
                            program: { select: { id: true, name: true, code: true } }
                        }
                    }
                }
            });
        });

        res.json({ assessmentType });
    } catch (error: any) {
        if (error.code === 'P2002') {
            res.status(400).json({ error: 'An assessment type with that name or code already exists' });
            return;
        }
        console.error('Update assessment type error:', error);
        res.status(500).json({ error: 'Failed to update assessment type' });
    }
};

// DELETE /api/assessment-types/:id
export const deleteAssessmentType = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        await prisma.assessmentType.delete({ where: { id: parseInt(id as string) } });
        res.json({ message: 'Assessment type deleted successfully' });
    } catch (error) {
        console.error('Delete assessment type error:', error);
        res.status(500).json({ error: 'Failed to delete assessment type' });
    }
};
