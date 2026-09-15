// src/services/apiClient.js
import axios from 'axios';

const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Initialize token from localStorage if present. Safe no-op if localStorage
// is unavailable (e.g. privacy mode, non-browser test environment) — the
// user simply starts unauthenticated, same as a first visit.
try {
    const storedToken = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    if (storedToken) {
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
    }
} catch {
    // Ignore in non-browser environments
}

// Token helper: updates Authorization header and localStorage
apiClient.setToken = (token) => {
    if (token) {
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        try {
            localStorage.setItem('token', token);
        } catch (e) {
            // Persisting the token is best-effort: the in-memory Authorization
            // header above still works for this session even if storage
            // (e.g. Safari private mode, full quota) rejects the write. Log
            // it so a silent logout-on-refresh isn't a total mystery later.
            console.warn('Failed to persist auth token to localStorage:', e);
        }
    } else {
        delete apiClient.defaults.headers.common['Authorization'];
        try {
            localStorage.removeItem('token');
        } catch (e) {
            console.warn('Failed to clear auth token from localStorage:', e);
        }
    }
};

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach((promise) => {
        if (error) {
            promise.reject(error);
        } else {
            promise.resolve(token);
        }
    });
    failedQueue = [];
};

// Global 401 response interceptor with automatic silent refresh
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response && error.response.status === 401 && originalRequest && !originalRequest._retry) {
            const url = originalRequest.url || '';
            const isAuthAction =
                url.includes('/auth/login') ||
                url.includes('/auth/register') ||
                url.includes('/auth/refresh');

            // If 401 occurred on login, register, or refresh itself, don't attempt another refresh
            if (isAuthAction) {
                return Promise.reject(error);
            }

            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        if (token) {
                            originalRequest.headers = originalRequest.headers || {};
                            originalRequest.headers['Authorization'] = `Bearer ${token}`;
                        }
                        return apiClient(originalRequest);
                    })
                    .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Perform token refresh using raw axios call so it doesn't re-trigger this interceptor
                const refreshBaseUrl = import.meta.env.VITE_API_URL || '/api';
                const { data } = await axios.post(
                    `${refreshBaseUrl}/auth/refresh`,
                    {},
                    { withCredentials: true }
                );

                const newAccessToken = data.accessToken || data.token;
                apiClient.setToken(newAccessToken);
                processQueue(null, newAccessToken);

                originalRequest.headers = originalRequest.headers || {};
                originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
                return apiClient(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                apiClient.setToken(null);

                if (typeof window !== 'undefined') {
                    const currentPath = window.location.pathname;
                    if (currentPath !== '/login') {
                        window.location.href = '/login';
                    }
                }
                return Promise.reject(error);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;
