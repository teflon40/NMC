import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../src/context/AuthContext';
import ErrorBoundary from '../src/components/ErrorBoundary';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
    const { user, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center">Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    if (allowedRoles) {
        const hasAccess = allowedRoles.some(role =>
            role.toLowerCase() === user.role.toLowerCase()
        );

        if (!hasAccess) {
            return <Navigate to="/dashboard" replace />;
        }
    }

    return (
        <ErrorBoundary>
            {children}
        </ErrorBoundary>
    );
};
