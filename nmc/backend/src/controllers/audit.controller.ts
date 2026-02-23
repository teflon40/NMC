import { Request, Response } from 'express';
import { auditService } from '../services/audit.service';

export const auditController = {
    // Get audit logs with filtering
    async getLogs(req: Request, res: Response) {
        try {
            const {
                role,
                action,
                entity,
                entityId,
                performedByUserId,
                startDate,
                endDate,
                limit = '100',
                offset = '0'
            } = req.query;

            const params: any = {
                limit: parseInt(limit as string),
                offset: parseInt(offset as string)
            };

            if (role) params.role = role as string;
            if (action) params.action = action as string;
            if (entity) params.entity = entity as string;
            if (entityId) params.entityId = parseInt(entityId as string);
            if (performedByUserId) params.performedByUserId = parseInt(performedByUserId as string);
            if (startDate) params.startDate = new Date(startDate as string);
            if (endDate) {
                const end = new Date(endDate as string);
                end.setHours(23, 59, 59, 999);
                params.endDate = end;
            }

            const { logs, total } = await auditService.getLogs(params);

            res.json({
                logs,
                total,
                limit: params.limit,
                offset: params.offset
            });
        } catch (error) {
            console.error('Get audit logs error:', error);
            res.status(500).json({ error: 'Failed to get audit logs' });
        }
    }
};
