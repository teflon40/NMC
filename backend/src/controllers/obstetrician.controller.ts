import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
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
                studentLevel
            },
            include: {
                student: true,
                examiner: true,
            },
        });

        res.status(201).json({ result });
    } catch (error) {
        logger.error('Submit obstetrician result error:', { error });
        res.status(500).json({ error: 'Failed to submit result' });
    }
};
