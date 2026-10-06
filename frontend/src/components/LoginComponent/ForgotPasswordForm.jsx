// src/components/LoginComponent/ForgotPasswordForm.jsx
import React, { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import EmailIcon from '@mui/icons-material/Email';
import useForm from '../../hooks/useForm';
import { validateEmail } from '../../utils/validate';
import userService from '../../services/userService';

const RESEND_COOLDOWN_SECONDS = 60;

function validate(vals) {
    const emailErr = validateEmail(vals.email);
    return emailErr ? { email: emailErr } : {};
}

export default function ForgotPasswordForm() {
    const [sent, setSent] = useState(false);
    const [serverError, setServerError] = useState('');
    const [cooldown, setCooldown] = useState(0);
    const [resending, setResending] = useState(false);

    useEffect(() => {
        if (cooldown <= 0) return undefined;
        const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [cooldown]);

    const { values, errors, isSubmitting, handleChange, handleSubmit } = useForm({
        initialValues: { email: '' },
        validate,
        onSubmit: async (vals) => {
            setServerError('');
            try {
                await userService.forgotPassword(vals.email);
                setSent(true);
                setCooldown(RESEND_COOLDOWN_SECONDS);
            } catch (err) {
                setServerError(err.response?.data?.message || 'Something went wrong. Please try again.');
            }
        },
    });

    const handleResend = async () => {
        setServerError('');
        setResending(true);
        try {
            await userService.forgotPassword(values.email);
            setCooldown(RESEND_COOLDOWN_SECONDS);
        } catch (err) {
            setServerError(err.response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setResending(false);
        }
    };

    if (sent) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Alert severity="success" sx={{ borderRadius: 2 }}>
                    If an account exists for <strong>{values.email}</strong>, we&apos;ve sent a link to reset your password. It expires in 30 minutes, and only the most recent link works.
                </Alert>
                {serverError && (
                    <Alert severity="error" onClose={() => setServerError('')} sx={{ borderRadius: 2 }}>
                        {serverError}
                    </Alert>
                )}
                <Button
                    variant="outlined"
                    onClick={handleResend}
                    disabled={cooldown > 0 || resending}
                    fullWidth
                    sx={{ minHeight: 44, fontWeight: 700 }}
                >
                    {resending ? <CircularProgress size={20} thickness={5} color="inherit" />
                        : cooldown > 0 ? `Resend email (${cooldown}s)` : 'Resend email'}
                </Button>
            </Box>
        );
    }

    return (
        <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
        >
            {serverError && (
                <Alert severity="error" onClose={() => setServerError('')} sx={{ borderRadius: 2 }}>
                    {serverError}
                </Alert>
            )}

            <TextField
                name="email"
                type="email"
                label="Email address"
                autoComplete="email"
                value={values.email}
                onChange={handleChange}
                required
                fullWidth
                error={Boolean(errors.email)}
                helperText={errors.email}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <EmailIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                        </InputAdornment>
                    ),
                }}
            />

            <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                disabled={isSubmitting}
                fullWidth
                sx={{ mt: 0.5, minHeight: 48, fontSize: '0.95rem', fontWeight: 700 }}
            >
                {isSubmitting ? (
                    <CircularProgress size={20} thickness={5} sx={{ color: 'rgba(255,255,255,0.8)' }} />
                ) : 'Send reset link'}
            </Button>
        </Box>
    );
}
