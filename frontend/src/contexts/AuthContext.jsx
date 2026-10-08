import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import { formatUserName } from '../utils/formatUtils';
import { ROUTES, homeRouteFor } from '../constants/routes';

const sanitizeUser = (userData) => {
    if (!userData || typeof userData !== 'object') return userData;
    return {
        ...userData,
        name: formatUserName(userData.name),
    };
};

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userId, setUserId] = useState(null);
    const [loading, setLoading] = useState(true);
    // True when the on-load session check couldn't reach a healthy API
    // (network failure or 5xx); the app shows a "can't reach server" page.
    const [serverDown, setServerDown] = useState(false);
    const navigate = useNavigate();

    // On mount, check if authenticated session exists via httpOnly cookie or stored token
    useEffect(() => {
        let isMounted = true;
        apiClient.get('/auth/me')
            .then(res => {
                if (isMounted) {
                    const formatted = sanitizeUser(res.data);
                    setUser(formatted);
                    setUserId(formatted.id || formatted._id);
                }
            })

            .catch((err) => {
                if (!isMounted) return;
                if (!err.response || err.response.status >= 500) {
                    // Keep the stored token: the session may be fine, the server isn't.
                    setServerDown(true);
                } else {
                    apiClient.setToken(null);
                    setUser(null);
                    setUserId(null);
                }
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    // Stores the session from an auth response and routes the user home.
    const completeSession = useCallback((data) => {
        const token = data.accessToken || data.token;
        if (token) {
            apiClient.setToken(token);
        }
        const formattedUser = sanitizeUser(data.user);
        setUser(formattedUser);
        setUserId(formattedUser?.id || formattedUser?._id);
        if (formattedUser?.mustChangePassword) {
            navigate(ROUTES.FORCE_PASSWORD_CHANGE, { replace: true });
        } else {
            navigate(homeRouteFor(formattedUser));
        }
        return formattedUser;
    }, [navigate]);

    // Login function (supports both login(email, password) and login({ email, password }))
    const login = useCallback(async (emailOrCredentials, maybePassword) => {
        setLoading(true);
        try {
            const email = (typeof emailOrCredentials === 'object' && emailOrCredentials !== null)
                ? emailOrCredentials.email
                : emailOrCredentials;
            const password = (typeof emailOrCredentials === 'object' && emailOrCredentials !== null)
                ? emailOrCredentials.password
                : maybePassword;

            const { data } = await apiClient.post('/auth/login', { email, password });
            return completeSession(data);
        } catch (error) {
            if (error.response && error.response.data) {
                // Keep the server's machine-readable code (e.g. EMAIL_NOT_VERIFIED) for the form.
                throw Object.assign(
                    new Error(error.response.data.message || 'Login failed, please check your credentials'),
                    { code: error.response.data.code },
                );
            } else {
                throw new Error('Login failed, please try again later');
            }
        } finally {
            setLoading(false);
        }
    }, [completeSession]);

    // Completes signup from the emailed link: the server signs the user in.
    const verifyEmail = useCallback(async (token) => {
        const { data } = await apiClient.post('/auth/verify-email', { token });
        return completeSession(data);
    }, [completeSession]);

    // Company self-service signup function
    const signup = useCallback(async ({ companyName, name, email, password, agreeToTerms }) => {
        setLoading(true);
        try {
            const { data } = await apiClient.post('/auth/register', {
                companyName,
                name: formatUserName(name),
                email,
                password,
                agreeToTerms: Boolean(agreeToTerms),
            });
            // No session yet: the user must follow the emailed verification link.
            return { email: data.email };
        } catch (error) {
            if (error.response && error.response.data) {
                throw new Error(error.response.data.message || 'Signup failed, please try again');
            } else {
                throw new Error('Signup failed, please try again later');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    // Logout function
    const logout = useCallback(async () => {
        try {
            await apiClient.post('/auth/logout');
        } catch (err) {
            console.error('Logout error:', err);
        } finally {
            apiClient.setToken(null);
            setUser(null);
            setUserId(null);
            navigate(ROUTES.LOGIN);
        }
    }, [navigate]);

    // Upload avatar function
    const updateAvatar = useCallback(async (file) => {
        const formData = new FormData();
        formData.append('avatar', file);
        const { data } = await apiClient.post('/auth/me/avatar', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        const formattedUser = sanitizeUser(data);
        setUser(formattedUser);
        return formattedUser;
    }, []);

    const handleSetUser = useCallback((newUserData) => {
        setUser(prev => {
            const nextVal = typeof newUserData === 'function' ? newUserData(prev) : newUserData;
            return sanitizeUser(nextVal);
        });
    }, []);

    // Memoize the provider value so consumers only re-render when something
    // they actually depend on changes, not on every AuthProvider render.
    const value = useMemo(() => ({
        user,
        setUser: handleSetUser,
        userId,
        loading,
        serverDown,
        login,
        signup,
        verifyEmail,
        logout,
        updateAvatar,
    }), [user, userId, loading, serverDown, handleSetUser, login, signup, verifyEmail, logout, updateAvatar]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export default AuthContext;
