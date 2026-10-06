// src/components/LoginComponent/ForgotPasswordForm.jsx
import React, { useState } from 'react';
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

function validate(vals) {
    const emailErr = validateEmail(vals.email);
    return emailErr ? { email: emailErr } : {};
}

export default function ForgotPasswordForm() {
    const [sent, setSent] = useState(false);
    const [serverError, setServerError] = useState('');

    const { values, errors, isSubmitting, handleChange, handleSubmit } = useForm({
        initialValues: { email: '' },
        validate,
        onSubmit: async (vals) => {
            setServerError('');
            try {
                await userService.forgotPassword(vals.email);
                setSent(true);
            } catch (err) {
                setServerError(err.response?.data?.message || 'Something went wrong. Please try again.');
            }
        },
    });

    if (sent) {
        return (
            <Alert severity="success" sx={{ borderRadius: 2 }}>
                If an account exists for <strong>{values.email}</strong>, we&apos;ve sent a link to reset your password. It expires in 30 minutes.
            </Alert>
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
