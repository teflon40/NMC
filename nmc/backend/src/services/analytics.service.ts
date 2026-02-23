import prisma from '../config/database';

export interface AnalyticsEventInput {
    eventType: string;
    pageUrl: string;
    details?: Record<string, any>;
    timestamp: string;
}

export const analyticsService = {
    /**
     * Store a batch of analytics events in the database.
     */
    async logBatch(events: AnalyticsEventInput[], userId?: number) {
        if (!events || events.length === 0) return;

        try {
            await prisma.analyticsEvent.createMany({
                data: events.map(event => ({
                    userId: userId || null,
                    eventType: event.eventType,
                    pageUrl: event.pageUrl || '/',
                    details: event.details ? (event.details as any) : undefined,
                    createdAt: new Date(event.timestamp || Date.now()),
                })),
                skipDuplicates: true
            });
        } catch (err) {
            console.error('Failed to log analytics batch', err);
        }
    },

    async getSummary(days: number = 30) {
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - days);

        // Group by eventType and date
        const events = await prisma.analyticsEvent.findMany({
            where: { createdAt: { gte: dateLimit } },
            select: { eventType: true, createdAt: true },
        });

        const summary: Record<string, Record<string, number>> = {};

        events.forEach(e => {
            const dateStr = e.createdAt.toISOString().split('T')[0];
            if (!summary[e.eventType]) summary[e.eventType] = {};
            summary[e.eventType][dateStr] = (summary[e.eventType][dateStr] || 0) + 1;
        });

        return summary;
    },

    async getPageViews(days: number = 30, limit: number = 5) {
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - days);

        const views = await prisma.analyticsEvent.groupBy({
            by: ['pageUrl'],
            where: {
                createdAt: { gte: dateLimit },
                eventType: 'page_view'
            },
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: limit,
        });

        return views.map(v => ({
            url: v.pageUrl,
            views: v._count.id
        }));
    },

    async getActiveUsers(days: number = 7) {
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - days);

        const activeUsers = await prisma.analyticsEvent.findMany({
            where: {
                createdAt: { gte: dateLimit },
                userId: { not: null }
            },
            distinct: ['userId'],
            select: { userId: true }
        });

        return activeUsers.length;
    },

    async getRecentActivity(limit: number = 10) {
        return prisma.analyticsEvent.findMany({
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { name: true, username: true } } }
        });
    }
};
