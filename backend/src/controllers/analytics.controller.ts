import { Request, Response } from 'express';
import { analyticsService } from '../services/analytics.service';

export const analyticsController = {
    /**
     * Log a batch of events
     */
    async logEvents(req: Request, res: Response): Promise<void> {
        try {
            const { events } = req.body;
            if (!Array.isArray(events) || events.length === 0) {
                res.status(400).json({ error: 'Valid events array required' });
                return;
            }

            // Check for user id from auth middleware
            let userId: number | undefined = undefined;
            const requestAny = req as any;
            if (requestAny.user && typeof requestAny.user === 'object' && 'userId' in requestAny.user) {
                userId = requestAny.user.userId;
            }

            await analyticsService.logBatch(events, userId);
            res.status(200).json({ success: true });
        } catch (error) {
            console.error('Analytics log error:', error);
            res.status(500).json({ error: 'Failed to log analytics' });
        }
    },

    async getSummary(req: Request, res: Response) {
        try {
            const days = parseInt(req.query.days as string) || 30;
            const summary = await analyticsService.getSummary(days);
            res.json(summary);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch summary' });
        }
    },

    async getPageViews(req: Request, res: Response) {
        try {
            const days = parseInt(req.query.days as string) || 30;
            const limit = parseInt(req.query.limit as string) || 5;
            const views = await analyticsService.getPageViews(days, limit);
            res.json(views);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch page views' });
        }
    },

    async getActiveUsers(req: Request, res: Response) {
        try {
            const days = parseInt(req.query.days as string) || 7;
            const count = await analyticsService.getActiveUsers(days);
            res.json({ count });
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch active users' });
        }
    },

    async getRecentActivity(req: Request, res: Response) {
        try {
            const limit = parseInt(req.query.limit as string) || 10;
            const activity = await analyticsService.getRecentActivity(limit);
            res.json(activity);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch recent activity' });
        }
    }
};
