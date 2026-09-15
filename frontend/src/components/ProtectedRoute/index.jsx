import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingComponent from '../LoadingComponent/LoadingComponent';
import { ROUTES } from '../../constants/routes';

/**
 * Wraps protected routes, redirecting unauthenticated users to login
 * and showing a loading state while auth is initializing.
 */
const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <LoadingComponent />;
    }

    if (!user) {
        return <Navigate to={ROUTES.LOGIN} replace />;
    }

    if (user.mustChangePassword) {
        return <Navigate to={ROUTES.FORCE_PASSWORD_CHANGE} replace />;
    }

    return children;
};

export default ProtectedRoute;
