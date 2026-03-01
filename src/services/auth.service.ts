import api from '../lib/api';

export interface LoginCredentials {
    username: string;
    password: string;
}

export interface User {
    id: number;
    name: string;
    username: string;
    email: string;
    role: 'ADMINISTRATOR' | 'EXAMINER';
    forcePasswordChange?: boolean;
}

export interface AuthResponse {
    user: User;
    accessToken: string;
    refreshToken: string;
}

export const authService = {
    async login(credentials: LoginCredentials): Promise<AuthResponse> {
        const response = await api.post('/auth/login', credentials);
        const { user, accessToken, refreshToken } = response.data;

        // Store tokens and user
        sessionStorage.setItem('accessToken', accessToken);
        sessionStorage.setItem('refreshToken', refreshToken);
        sessionStorage.setItem('user', JSON.stringify(user));

        return response.data;
    },

    async getMe(): Promise<User> {
        const response = await api.get('/auth/me');
        return response.data.user;
    },

    async logout(): Promise<void> {
        try {
            const refreshToken = sessionStorage.getItem('refreshToken');
            if (refreshToken) {
                await api.post('/auth/logout', { refreshToken });
            }
        } catch {
            // If the backend call fails (e.g. network error), still clear local state
        } finally {
            sessionStorage.removeItem('accessToken');
            sessionStorage.removeItem('refreshToken');
            sessionStorage.removeItem('user');
        }
    },

    getCurrentUser(): User | null {
        const userStr = sessionStorage.getItem('user');
        if (userStr) {
            try {
                return JSON.parse(userStr);
            } catch {
                return null;
            }
        }
        return null;
    },

    isAuthenticated(): boolean {
        return !!sessionStorage.getItem('accessToken');
    },
};

