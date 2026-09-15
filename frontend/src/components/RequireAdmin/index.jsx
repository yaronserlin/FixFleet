import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ROUTES } from '../../constants/routes';
import { ROLES } from '../../constants/roles';

export default function RequireAdmin({ children }) {
    const { user } = useAuth();

    if (!user) {
        return <Navigate to={ROUTES.LOGIN} replace />;
    }

    if (user.role !== ROLES.ADMIN) {
        return <Navigate to={ROUTES.EQUIPMENT} replace />;
    }

    return children;
}
