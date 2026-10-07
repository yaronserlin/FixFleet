import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingComponent from '../LoadingComponent/LoadingComponent';
import { ROUTES } from '../../constants/routes';
import { ROLES } from '../../constants/roles';

// The only protected pages a superadmin (no company) can use.
const SUPERADMIN_PATHS = [ROUTES.SUPERADMIN, ROUTES.ACCOUNT, ROUTES.LOGOUT];

/**
 * Wraps protected routes, redirecting unauthenticated users to login
 * and showing a loading state while auth is initializing. A superadmin is
 * kept on the platform pages, since every tenant page needs a company.
 */
const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    const { pathname } = useLocation();

    if (loading) {
        return <LoadingComponent />;
    }

    if (!user) {
        return <Navigate to={ROUTES.LOGIN} replace />;
    }

    if (user.mustChangePassword) {
        return <Navigate to={ROUTES.FORCE_PASSWORD_CHANGE} replace />;
    }

    if (user.role === ROLES.SUPERADMIN && !SUPERADMIN_PATHS.includes(pathname)) {
        return <Navigate to={ROUTES.SUPERADMIN} replace />;
    }

    return children;
};

export default ProtectedRoute;
