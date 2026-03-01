import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export const errorHandler = (
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
): void => {
    logger.error('Error:', { message: err.message, stack: err.stack });

    if (err.name === 'JsonWebTokenError') {
        res.status(401).json({ error: 'Invalid token' });
        return;
    }

    if (err.name === 'TokenExpiredError') {
        res.status(401).json({ error: 'Token expired' });
        return;
    }

    if (err.name === 'ValidationError') {
        res.status(400).json({ error: err.message });
        return;
    }

    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
};
