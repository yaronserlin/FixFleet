// src/pages/Logout.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PageSkeleton } from '../components/Skeletons/Skeletons';
import { ROUTES } from '../constants/routes';

export default function Logout() {
    const { logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        logout();
        // after logout, send the user to /login (or wherever)
        navigate(ROUTES.LOGIN, { replace: true });
    }, [logout, navigate]);

    return <PageSkeleton label="Signing out" />;
}
