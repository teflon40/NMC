import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, authService } from '../services/auth.service';
import { useNavigate, useLocation } from 'react-router-dom';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (user: User) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const initAuth = async () => {
            try {
                const currentUser = authService.getCurrentUser();
                if (currentUser) {
                    // Verify with backend if token is still valid
                    try {
                        const verifiedUser = await authService.getMe();
                        setUser(verifiedUser);
                    } catch (e) {
                        // Token invalid
                        authService.logout();
                        setUser(null);
                    }
                }
            } catch (error) {
                console.error('Auth initialization error:', error);
            } finally {
                setIsLoading(false);
            }
        };

        initAuth();
    }, []);

    const login = (userData: User) => {
        setUser(userData);
        // Redirect to where they were trying to go, or dashboard
        const origin = (location.state as any)?.from?.pathname || '/dashboard';
        navigate(origin);
    };

    const logout = async () => {
        await authService.logout();
        setUser(null);
        navigate('/');
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
