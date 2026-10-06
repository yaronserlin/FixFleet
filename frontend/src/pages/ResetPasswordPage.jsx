// src/pages/ResetPasswordPage.jsx
import React, { useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import {
    Box,
    Paper,
    Typography,
    Button,
    Alert,
    CircularProgress,
    Container,
} from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockReset';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import userService from '../services/userService';
import { ROUTES } from '../constants/routes';
import PasswordField from '../components/Form/PasswordField';

export default function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(token ? '' : 'This reset link is invalid. Please request a new one.');
    const [done, setDone] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!newPassword || newPassword.length < 8) {
            setError('New password must be at least 8 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('New password and confirmation do not match');
            return;
        }

        setLoading(true);
        try {
            await userService.resetPassword(token, newPassword);
            setDone(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reset password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100dvh',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: (theme) => theme.palette.mode === 'dark' ? '#0b0f19' : '#f4f6f8',
                p: { xs: 2, sm: 3 },
            }}
        >
            <Container maxWidth="xs" disableGutters>
                <Paper
                    elevation={4}
                    sx={{
                        p: { xs: 3, sm: 4 },
                        borderRadius: 3,
                        borderTop: '5px solid',
                        borderColor: 'primary.main',
                        textAlign: 'center',
                    }}
                >
                    <Box
                        sx={{
                            width: 56,
                            height: 56,
                            borderRadius: '50%',
                            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(37,99,235,0.2)' : 'rgba(37,99,235,0.1)',
                            color: 'primary.main',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mx: 'auto',
                            mb: 2,
                        }}
                    >
                        <LockResetIcon sx={{ fontSize: 32 }} />
                    </Box>

                    <Typography variant="h5" fontWeight={800} letterSpacing="-0.02em" gutterBottom>
                        Reset Your Password
                    </Typography>

                    {done ? (
                        <>
                            <Alert severity="success" sx={{ my: 2.5, textAlign: 'left', borderRadius: 2 }}>
                                Your password has been reset. You can now sign in with your new password.
                            </Alert>
                            <Button component={RouterLink} to={ROUTES.LOGIN} variant="contained" fullWidth sx={{ minHeight: 48, fontWeight: 700 }}>
                                Sign in
                            </Button>
                        </>
                    ) : (
                        <>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                Choose a new password for your account.
                            </Typography>

                            {error && (
                                <Alert severity="error" sx={{ mb: 2.5, textAlign: 'left', borderRadius: 2 }}>
                                    {error}
                                </Alert>
                            )}

                            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <PasswordField
                                    fullWidth
                                    size="medium"
                                    label="New Password"
                                    name="newPassword"
                                    autoComplete="new-password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    disabled={loading || !token}
                                    helperText="Minimum 8 characters"
                                    startAdornment={<LockOutlinedIcon sx={{ color: 'text.disabled', fontSize: 20 }} />}
                                />

                                <PasswordField
                                    fullWidth
                                    size="medium"
                                    label="Confirm New Password"
                                    name="confirmPassword"
                                    autoComplete="new-password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    disabled={loading || !token}
                                    startAdornment={<LockOutlinedIcon sx={{ color: 'text.disabled', fontSize: 20 }} />}
                                />

                                <Button
                                    type="submit"
                                    variant="contained"
                                    size="large"
                                    disabled={loading || !token}
                                    fullWidth
                                    sx={{ minHeight: 48, fontWeight: 700 }}
                                >
                                    {loading ? <CircularProgress size={20} thickness={5} color="inherit" /> : 'Reset password'}
                                </Button>

                                <Button component={RouterLink} to={ROUTES.LOGIN} variant="text" size="small">
                                    Back to sign in
                                </Button>
                            </Box>
                        </>
                    )}
                </Paper>
            </Container>
        </Box>
    );
}
