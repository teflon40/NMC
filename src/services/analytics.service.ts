import api from '../lib/api';

export interface AnalyticsEvent {
    eventType: string;
    pageUrl: string;
    details?: Record<string, any>;
    timestamp: string;
}

class AnalyticsService {
    private eventQueue: AnalyticsEvent[] = [];
    private isFlushing = false;
    private maxQueueSize = 50;

    constructor() {
        // Flush every 5 seconds if there are events
        setInterval(() => {
            if (this.eventQueue.length > 0) {
                this.flush();
            }
        }, 5000);

        // Also try to flush when the user leaves the page or closes the tab
        window.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden' && this.eventQueue.length > 0) {
                this.flush(true);
            }
        });
    }

    /**
     * Add an event to the queue.
     */
    public logEvent(eventType: string, details?: Record<string, any>) {
        const event: AnalyticsEvent = {
            eventType,
            pageUrl: window.location.pathname + window.location.search,
            details,
            timestamp: new Date().toISOString()
        };

        this.eventQueue.push(event);

        if (this.eventQueue.length >= this.maxQueueSize) {
            this.flush();
        }
    }

    /**
     * Send all buffered events to the backend.
     * @param isBeacon Use navigator.sendBeacon during unload to ensure delivery
     */
    private async flush(isBeacon = false) {
        if (this.eventQueue.length === 0 || this.isFlushing) return;

        const eventsToFlush = [...this.eventQueue];
        this.eventQueue = []; // Clear queue immediately
        this.isFlushing = true;

        try {
            const token = sessionStorage.getItem('accessToken');

            if (isBeacon && navigator.sendBeacon) {
                // Formatting as JSON string for sendBeacon or standard fetch keepalive
                const headers = new Headers({ 'Content-Type': 'application/json' });
                if (token) headers.append('Authorization', `Bearer ${token}`);

                // Assuming api.defaults.baseURL is present
                const baseUrl = api.defaults.baseURL || '/api';
                fetch(`${baseUrl}/analytics/log`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ events: eventsToFlush }),
                    keepalive: true
                }).catch(() => { });
            } else {
                await api.post('/analytics/log', { events: eventsToFlush });
            }
        } catch (error) {
            // If it failed, put them back at the beginning of the queue (basic retry)
            console.warn('Failed to flush analytics, re-queueing', error);
            this.eventQueue = [...eventsToFlush, ...this.eventQueue];
        } finally {
            this.isFlushing = false;
        }
    }
}

export const analyticsService = new AnalyticsService();
