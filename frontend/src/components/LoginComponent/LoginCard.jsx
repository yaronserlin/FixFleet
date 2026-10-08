// src/components/LoginComponent/LoginCard.jsx
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';
import ForgotPasswordForm from './ForgotPasswordForm';
import { ROUTES } from '../../constants/routes';

export default function LoginCard() {
    // Sign-up has its own route (/signup); "forgot password" is a step within /login.
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const [forgot, setForgot] = useState(false);
    const isSignup = pathname === ROUTES.SIGNUP;
    const isForgot = !isSignup && forgot;
    const isLogin = !isSignup && !forgot;

    const handleToggle = () => {
        if (isForgot) setForgot(false);
        else navigate(isLogin ? ROUTES.SIGNUP : ROUTES.LOGIN);
    };

    return (
        <Box>
            {/* Heading */}
            <Box sx={{ mb: 4 }}>
                <Typography
                    variant="h4"
                    fontWeight={800}
                    letterSpacing="-0.025em"
                    gutterBottom
                    sx={{ color: 'text.primary', lineHeight: 1.2 }}
                >
                    {isForgot ? 'Forgot password' : isLogin ? 'Welcome back' : 'Create an account'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                    {isForgot
                        ? "Enter your account email and we'll send you a link to reset your password."
                        : isLogin
                        ? 'Sign in to access your fleet management dashboard.'
                        : 'Set up your company account to get started.'
                    }
                </Typography>
            </Box>

            {/* Form */}
            {isForgot
                ? <ForgotPasswordForm />
                : isLogin
                ? <LoginForm onForgotPassword={() => setForgot(true)} />
                : <SignupForm />}

            {/* Toggle */}
            <Divider sx={{ my: 3 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75 }}>
                <Typography variant="body2" color="text.secondary">
                    {isForgot ? 'Remembered it?' : isLogin ? "Don't have an account?" : 'Already have an account?'}
                </Typography>
                <Button
                    size="small"
                    variant="text"
                    onClick={handleToggle}
                    sx={{
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        p: '2px 6px',
                        minHeight: 'auto',
                        textDecoration: 'underline',
                        textUnderlineOffset: 3,
                        '&:hover': { textDecoration: 'underline', opacity: 0.8 },
                    }}
                >
                    {isLogin ? 'Sign up' : 'Sign in'}
                </Button>
            </Box>

        </Box>
    );
}
