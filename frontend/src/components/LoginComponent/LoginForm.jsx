// src/components/LoginComponent/LoginForm.jsx
import React, { useState } from 'react';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import { useAuth } from '../../contexts/AuthContext';
import useForm from '../../hooks/useForm';
import { validateEmail, isRequired } from '../../utils/validate';
import PasswordField from '../Form/PasswordField';

function validate(vals) {
    const errs = {};
    const emailErr = validateEmail(vals.email);
    if (emailErr) errs.email = emailErr;
    const pwdErr = isRequired(vals.password, 'Password');
    if (pwdErr) errs.password = pwdErr;
    return errs;
}

export default function LoginForm() {
    const { login, loading } = useAuth();
    const [serverError, setServerError] = useState('');

    const { values, errors, isSubmitting, handleChange, handleSubmit, resetForm } = useForm({
        initialValues: { email: '', password: '' },
        validate,
        onSubmit: async (vals) => {
            setServerError('');
            try {
                await login(vals.email, vals.password);
                resetForm();
            } catch (err) {
                setServerError(err.message || 'Invalid email or password. Please try again.');
            }
        },
    });

    const handleInputChange = (e) => {
        if (serverError) setServerError('');
        handleChange(e);
    };

    const busy = isSubmitting || loading;

    return (
        <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
        >
            {serverError && (
                <Alert
                    severity="error"
                    onClose={() => setServerError('')}
                    sx={{ borderRadius: 2 }}
                >
                    {serverError}
                </Alert>
            )}

            {/* Email */}
            <TextField
                name="email"
                type="email"
                label="Email address"
                autoComplete="email"
                value={values.email}
                onChange={handleInputChange}
                required
                fullWidth
                error={Boolean(errors.email)}
                helperText={errors.email}
                slotProps={{ input: {
                    startAdornment: (
                        <InputAdornment position="start">
                            <EmailIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                        </InputAdornment>
                    ),
                } }}
            />

            {/* Password */}
            <PasswordField
                name="password"
                label="Password"
                autoComplete="current-password"
                value={values.password}
                onChange={handleInputChange}
                required
                fullWidth
                error={Boolean(errors.password)}
                helperText={errors.password}
                startAdornment={<LockIcon sx={{ fontSize: 18, color: 'text.disabled' }} />}
            />

            {/* Submit */}
            <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                disabled={busy}
                fullWidth
                sx={{
                    mt: 0.5,
                    minHeight: 48,
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    position: 'relative',
                }}
            >
                {busy ? (
                    <CircularProgress
                        size={20}
                        thickness={5}
                        sx={{ color: 'rgba(255,255,255,0.8)' }}
                    />
                ) : 'Sign in'}
            </Button>
        </Box>
    );
}
