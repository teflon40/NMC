import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { analyticsService } from '../services/analytics.service';
import { useAuth } from '../context/AuthContext';

export const GlobalAnalyticsTracker = () => {
    const location = useLocation();
    const { user } = useAuth();

    // 1. Track Page Views (when the URL changes)
    useEffect(() => {
        if (!user) return; // Only track authenticated users for now
        analyticsService.logEvent('page_view', { path: location.pathname, search: location.search });
    }, [location.pathname, location.search, user]);

    // 2. Track Clicks (buttons, links)
    useEffect(() => {
        if (!user) return;

        const handleGlobalClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            // Find the closest button or anchor tag
            const clickable = target.closest('button, a, [role="button"]');

            if (clickable) {
                const elementText = clickable.textContent?.trim().slice(0, 50) || '';
                const elementId = clickable.id || '';
                const className = clickable.className || '';

                analyticsService.logEvent('click', {
                    tag: clickable.tagName.toLowerCase(),
                    text: elementText,
                    id: elementId,
                    className: typeof className === 'string' ? className : 'complex-class',
                    path: location.pathname
                });
            }
        };

        // Use capture phase to ensure we catch it even if a React event stops propagation
        document.addEventListener('click', handleGlobalClick, { capture: true });
        return () => document.removeEventListener('click', handleGlobalClick, { capture: true });
    }, [location.pathname, user]);

    // 3. Track Scroll Depth (debounced)
    useEffect(() => {
        if (!user) return;

        let debounceTimer: ReturnType<typeof setTimeout>;
        let maxScrollDepth = 0;

        const handleScroll = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                const scrollPosition = window.scrollY + window.innerHeight;
                const totalHeight = document.body.scrollHeight;
                const percentage = Math.round((scrollPosition / totalHeight) * 100);

                if (percentage > maxScrollDepth + 20) { // Only log every 20% milestone
                    maxScrollDepth = percentage;
                    analyticsService.logEvent('scroll_depth', {
                        depth_percentage: maxScrollDepth,
                        path: location.pathname
                    });
                }
            }, 1000); // 1 second debounce
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [location.pathname, user]);

    return null; // Invisible component
};
