import axios from 'axios';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL,
    timeout: 10000, // 10-second timeout to prevent infinite spinners
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = sessionStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.code === 'ECONNABORTED' || (!error.response && error.message === 'Network Error')) {
            window.dispatchEvent(new CustomEvent('api-error', {
                detail: 'Failed to load data. The server is unresponsive or the request timed out. Please refresh the page or contact support.'
            }));
            return Promise.reject(error);
        }

        // Automatically handle access restricted (time-based access control)
        if (error.response?.status === 403 && error.response?.data?.error === 'access_restricted') {
            const { message, nextOpen } = error.response.data;
            window.dispatchEvent(new CustomEvent('api-error', {
                detail: `${message}${nextOpen ? ` Access reopens: ${nextOpen}.` : ''}`
            }));
            // Redirect to the access restricted page if not already there
            if (!window.location.pathname.includes('/access-restricted')) {
                window.location.href = '/access-restricted';
            }
            return Promise.reject(error);
        }

        // If 401 and we haven't tried to refresh yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = sessionStorage.getItem('refreshToken');
                if (refreshToken) {
                    const response = await axios.post(`${API_URL}/auth/refresh`, {
                        refreshToken,
                    });

                    const { accessToken } = response.data;
                    sessionStorage.setItem('accessToken', accessToken);

                    // Retry original request with new token
                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                    return api(originalRequest);
                } else {
                    // No refresh token available, clear session and redirect to login
                    sessionStorage.removeItem('accessToken');
                    sessionStorage.removeItem('refreshToken');
                    sessionStorage.removeItem('user');
                    window.location.href = '/';
                    return Promise.reject(error);
                }
            } catch (refreshError) {
                // Refresh failed, logout user
                sessionStorage.removeItem('accessToken');
                sessionStorage.removeItem('refreshToken');
                sessionStorage.removeItem('user');
                window.location.href = '/';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
