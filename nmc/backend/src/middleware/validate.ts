import { Request, Response, NextFunction } from 'express';
import { ZodObject, ZodError } from 'zod';

export const validate = (schema: ZodObject<any>) => (req: Request, res: Response, next: NextFunction): void => {
    try {
        schema.parse(req.body);
        next();
    } catch (error) {
        if (error instanceof ZodError) {
            res.status(400).json({
                error: 'Validation Error',
                details: (error as ZodError).issues.map((e: any) => ({
                    field: e.path.join('.'),
                    message: e.message
                }))
            });
            return;
        }
        next(error);
    }
};
