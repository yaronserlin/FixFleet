import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import { formatUserName } from '../utils/formatUtils';

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
    const [loginPassword, setLoginPassword] = useState('');
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

            .catch(() => {
                if (isMounted) {
                    apiClient.setToken(null);
                    setUser(null);
                    setUserId(null);
                    setLoginPassword('');
                }
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, []);

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

            // Preserve the entered password for seamless first-time forced password change
            setLoginPassword(password || '');

            const { data } = await apiClient.post('/auth/login', { email, password });
            const token = data.accessToken || data.token;
            if (token) {
                apiClient.setToken(token);
            }
            const formattedUser = sanitizeUser(data.user);
            setUser(formattedUser);
            setUserId(formattedUser?.id || formattedUser?._id);
            if (formattedUser?.mustChangePassword) {
                navigate('/force-password-change', { replace: true });
            } else {
                navigate('/dashboard');
            }
            return formattedUser;
        } catch (error) {
            setLoginPassword('');
            if (error.response && error.response.data) {
                throw new Error(error.response.data.message || 'Login failed, please check your credentials');
            } else {
                throw new Error('Login failed, please try again later');
            }
        } finally {
            setLoading(false);
        }
    }, [navigate]);

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
            const token = data.accessToken || data.token;
            if (token) {
                apiClient.setToken(token);
            }
            const formattedUser = sanitizeUser(data.user);
            setUser(formattedUser);
            setUserId(formattedUser?.id || formattedUser?._id);
            if (formattedUser?.mustChangePassword) {
                navigate('/force-password-change', { replace: true });
            } else {
                navigate('/dashboard');
            }
            return formattedUser;
        } catch (error) {
            if (error.response && error.response.data) {
                throw new Error(error.response.data.message || 'Signup failed, please try again');
            } else {
                throw new Error('Signup failed, please try again later');
            }
        } finally {
            setLoading(false);
        }
    }, [navigate]);

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
            setLoginPassword('');
            navigate('/login');
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

    const clearLoginPassword = useCallback(() => {
        setLoginPassword('');
    }, []);

    // Memoize the provider value so consumers only re-render when something
    // they actually depend on changes, not on every AuthProvider render.
    const value = useMemo(() => ({
        user,
        setUser: handleSetUser,
        userId,
        loading,
        login,
        signup,
        logout,
        updateAvatar,
        loginPassword,
        clearLoginPassword,
    }), [user, userId, loading, loginPassword, handleSetUser, login, signup, logout, updateAvatar, clearLoginPassword]);

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
