// src/pages/ForcePasswordChangePage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    Alert,
    CircularProgress,
    InputAdornment,
    IconButton,
    Container,
} from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockReset';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Link from '@mui/material/Link';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../contexts/AuthContext';
import userService from '../services/userService';
import { formatUserName } from '../utils/formatUtils';
import LegalModal from '../components/Legal/LegalModal';
import { ROUTES } from '../constants/routes';

export default function ForcePasswordChangePage() {
    const { user, setUser, logout, loginPassword, clearLoginPassword } = useAuth();
    const navigate = useNavigate();

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [agreeToTerms, setAgreeToTerms] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [legalModalOpen, setLegalModalOpen] = useState(false);
    const [legalDefaultTab, setLegalDefaultTab] = useState('terms');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!newPassword || newPassword.length < 6) {
            setError('New password must be at least 6 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('New password and confirmation do not match');
            return;
        }
        if (!agreeToTerms) {
            setError('You must agree to the Terms of Service and Privacy Policy to continue');
            return;
        }

        setLoading(true);
        try {
            await userService.changePassword({
                currentPassword: loginPassword || undefined,
                newPassword,
                agreeToTerms: true,
            });
            clearLoginPassword?.();
            setUser(prev => ({
                ...prev,
                mustChangePassword: false,
                termsAccepted: true,
            }));
            navigate(ROUTES.DASHBOARD, { replace: true });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update password. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100dvh',
                width: '100vw',
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
                        Set Your Password
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Welcome{user?.name ? `, ${formatUserName(user.name)}` : ''}! As a security precaution, please set a new personal password before accessing your account.
                    </Typography>

                    {error && (
                        <Alert severity="error" sx={{ mb: 2.5, textAlign: 'left', borderRadius: 2 }}>
                            {error}
                        </Alert>
                    )}

                    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            fullWidth
                            size="medium"
                            label="New Password"
                            type={showNew ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            disabled={loading}
                            helperText="Minimum 6 characters"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <LockOutlinedIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() => setShowNew(p => !p)}
                                            edge="end"
                                            size="small"
                                            aria-label="toggle new password visibility"
                                        >
                                            {showNew ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <TextField
                            fullWidth
                            size="medium"
                            label="Confirm New Password"
                            type={showConfirm ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            disabled={loading}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <LockOutlinedIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() => setShowConfirm(p => !p)}
                                            edge="end"
                                            size="small"
                                            aria-label="toggle confirm password visibility"
                                        >
                                            {showConfirm ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />

                        {/* Terms and Privacy Agreement Checkbox */}
                        <Box sx={{ textAlign: 'left', mt: 0.5 }}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={agreeToTerms}
                                        onChange={(e) => {
                                            if (error) setError('');
                                            setAgreeToTerms(e.target.checked);
                                        }}
                                        color="primary"
                                        size="small"
                                        disabled={loading}
                                    />
                                }
                                label={
                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                                        I agree to the{' '}
                                        <Link
                                            component="button"
                                            type="button"
                                            variant="body2"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setLegalDefaultTab('terms');
                                                setLegalModalOpen(true);
                                            }}
                                            sx={{ verticalAlign: 'baseline', fontWeight: 600, fontSize: '0.85rem' }}
                                        >
                                            Terms of Service
                                        </Link>
                                        {' '}and{' '}
                                        <Link
                                            component="button"
                                            type="button"
                                            variant="body2"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setLegalDefaultTab('privacy');
                                                setLegalModalOpen(true);
                                            }}
                                            sx={{ verticalAlign: 'baseline', fontWeight: 600, fontSize: '0.85rem' }}
                                        >
                                            Privacy Policy
                                        </Link>
                                    </Typography>
                                }
                            />
                        </Box>

                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            size="large"
                            fullWidth
                            disabled={loading}
                            sx={{
                                mt: 1,
                                minHeight: 46,
                                fontWeight: 700,
                                fontSize: '0.95rem',
                            }}
                        >
                            {loading ? <CircularProgress size={22} color="inherit" /> : 'Set Password & Continue'}
                        </Button>

                        <Button
                            variant="text"
                            color="inherit"
                            size="small"
                            onClick={logout}
                            disabled={loading}
                            startIcon={<LogoutIcon fontSize="small" />}
                            sx={{ color: 'text.secondary', fontWeight: 600, mt: 0.5 }}
                        >
                            Log out and sign in with another account
                        </Button>
                    </Box>

                    <LegalModal
                        open={legalModalOpen}
                        onClose={() => setLegalModalOpen(false)}
                        defaultTab={legalDefaultTab}
                    />
                </Paper>
            </Container>
        </Box>
    );
}
