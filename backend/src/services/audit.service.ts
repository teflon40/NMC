import prisma from '../config/database';

interface CreateAuditLogParams {
    userId: number;
    action: string;
    entity: string;
    entityId?: number;
    details?: any;
    ipAddress?: string;
}

interface GetAuditLogsParams {
    userId?: number;
    role?: string;
    action?: string;
    entity?: string;
    entityId?: number;
    performedByUserId?: number;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
}

export const auditService = {
    async createLog(params: CreateAuditLogParams) {
        return await prisma.auditLog.create({
            data: {
                userId: params.userId,
                action: params.action,
                entity: params.entity,
                entityId: params.entityId,
                details: params.details,
                ipAddress: params.ipAddress
            }
        });
    },

    async getLogs(params: GetAuditLogsParams = {}) {
        const where: any = {};

        if (params.performedByUserId) {
            where.userId = params.performedByUserId;
        } else if (params.userId) {
            where.userId = params.userId;
        }

        if (params.role) {
            where.user = {
                role: params.role
            };
        }

        if (params.action) {
            where.action = {
                contains: params.action,
                mode: 'insensitive'
            };
        }

        if (params.entity) {
            where.entity = params.entity;
        }

        if (params.entityId) {
            where.entityId = params.entityId;
        }

        if (params.startDate || params.endDate) {
            where.createdAt = {};
            if (params.startDate) {
                where.createdAt.gte = params.startDate;
            }
            if (params.endDate) {
                where.createdAt.lte = params.endDate;
            }
        }

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            username: true,
                            role: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take: params.limit || 100,
                skip: params.offset || 0
            }),
            prisma.auditLog.count({ where })
        ]);

        return { logs, total };
    }
};
