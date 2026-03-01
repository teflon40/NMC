import { Request, Response, NextFunction } from 'express';
import { auditService } from '../services/audit.service';

// Middleware to automatically log certain actions
export const auditMiddleware = (action: string, entity: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        // Store original send function
        const originalSend = res.send;

        // Override send to capture response
        res.send = function (data: any): Response {
            // Only log on successful responses (2xx status codes)
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const user = (req as any).user;
                if (user) {
                    // Extract entity ID from request or response
                    let entityId: number | undefined;

                    // Try to get ID from params, body, or parsed response
                    if (req.params.id) {
                        entityId = parseInt(req.params.id as string);
                    } else if (req.body?.id) {
                        entityId = req.body.id;
                    } else {
                        try {
                            const responseData = typeof data === 'string' ? JSON.parse(data) : data;
                            if (responseData?.id) {
                                entityId = responseData.id;
                            }
                        } catch (e) {
                            // Ignore parse errors
                        }
                    }

                    // Log asynchronously (don't wait)
                    auditService.createLog({
                        userId: user.userId,
                        action,
                        entity,
                        entityId,
                        details: {
                            method: req.method,
                            path: req.path,
                            body: req.body ? Object.fromEntries(
                                Object.entries(req.body).map(([key, value]) => [
                                    key,
                                    ['password', 'passwordHash', 'token', 'refreshToken'].includes(key)
                                        ? '[REDACTED]'
                                        : value
                                ])
                            ) : undefined
                        },
                        ipAddress: req.ip || req.socket.remoteAddress
                    }).catch(err => {
                        console.error('Failed to create audit log:', err);
                    });
                }
            }

            // Call original send
            return originalSend.call(this, data);
        };

        next();
    };
};
