// src/components/LoginComponent/LoginCard.jsx
import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';
import ForgotPasswordForm from './ForgotPasswordForm';

export default function LoginCard() {
    const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'forgot'
    const isLogin = mode === 'login';
    const isForgot = mode === 'forgot';

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
                ? <LoginForm onForgotPassword={() => setMode('forgot')} />
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
                    onClick={() => setMode(isLogin ? 'signup' : 'login')}
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
