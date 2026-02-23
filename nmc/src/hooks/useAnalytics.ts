import { useEffect } from 'react';
import { analyticsService } from '../services/analytics.service';

/**
 * Simple analytics hook.
 * Logs a page view when the component mounts and provides a helper to log custom events.
 *
 * @param pageName - Human readable name of the page/component (e.g. 'Audit Log')
 */
export const useAnalytics = (pageName: string) => {
    useEffect(() => {
        analyticsService.logEvent('page_view', { page: pageName });
    }, [pageName]);

    const track = (event: string, details: Record<string, any> = {}) => {
        analyticsService.logEvent(event, { page: pageName, ...details });
    };

    return { track };
};
