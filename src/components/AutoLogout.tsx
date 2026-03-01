import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

export const AutoLogout = () => {
    const { isAuthenticated, logout } = useAuth();

    useEffect(() => {
        if (!isAuthenticated) return;

        let logoutTimer: number;

        const resetTimer = () => {
            window.clearTimeout(logoutTimer);
            logoutTimer = window.setTimeout(() => {
                // Timer expired, user is inactive
                logout();
            }, TIMEOUT_DURATION);
        };

        // Events that indicate user activity
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

        // Add listeners
        events.forEach(event => {
            document.addEventListener(event, resetTimer, { passive: true });
        });

        // Initialize the first timer
        resetTimer();

        // Cleanup
        return () => {
            window.clearTimeout(logoutTimer);
            events.forEach(event => {
                document.removeEventListener(event, resetTimer);
            });
        };
    }, [isAuthenticated, logout]);

    return null; // This component doesn't render anything
};
