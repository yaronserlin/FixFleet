import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoginComponent from '../components/LoginComponent';
import { ROUTES } from '../constants/routes';

function Login() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && user) {
            if (user.mustChangePassword) {
                navigate(ROUTES.FORCE_PASSWORD_CHANGE, { replace: true });
            } else {
                navigate(ROUTES.DASHBOARD, { replace: true });
            }
        }
    }, [user, loading, navigate]);

    return <LoginComponent />;
}

export default Login;