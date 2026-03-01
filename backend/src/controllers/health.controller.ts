import { Request, Response } from 'express';
import prisma from '../config/database';

export const checkHealth = async (_req: Request, res: Response): Promise<void> => {
    try {
        // Ping the database with a simple query
        await prisma.$queryRaw`SELECT 1`;

        res.status(200).json({
            status: 'ok',
            database: 'connected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(503).json({
            status: 'error',
            database: 'disconnected',
            timestamp: new Date().toISOString(),
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
