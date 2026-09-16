import React, { useState, useRef } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Alert,
    CircularProgress,
} from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockReset';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Link from '@mui/material/Link';
import { useAuth } from '../../contexts/AuthContext';
import userService from '../../services/userService';
import LegalModal from '../Legal/LegalModal';
import PasswordField from '../Form/PasswordField';

export default function ForcePasswordChangeDialog() {
    const { user, setUser, logout, loginPassword, clearLoginPassword } = useAuth();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [agreeToTerms, setAgreeToTerms] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [legalModalOpen, setLegalModalOpen] = useState(false);
    const [legalDefaultTab, setLegalDefaultTab] = useState('terms');
    const newPasswordInputRef = useRef(null);

    const open = Boolean(user && user.mustChangePassword);

    if (!open) return null;

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
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update password. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={open}
            disableEscapeKeyDown
            maxWidth="xs"
            fullWidth
            slotProps={{
                transition: {
                    onEntered: () => newPasswordInputRef.current?.focus(),
                },
            }}
            sx={{
                '& .MuiDialog-paper': {
                    p: 1,
                    borderRadius: 3,
                    boxShadow: 24,
                },
            }}
        >
            <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                    sx={{
                        p: 1,
                        borderRadius: 2,
                        bgcolor: 'warning.light',
                        color: 'warning.contrastText',
                        display: 'flex',
                    }}
                >
                    <LockResetIcon />
                </Box>
                <Box>
                    <Typography variant="h6" fontWeight={700}>
                        Password Change Required
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        First-time security setup
                    </Typography>
                </Box>
            </DialogTitle>

            <Box component="form" onSubmit={handleSubmit}>
                <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Alert severity="warning" sx={{ fontSize: '0.85rem' }}>
                        Welcome to the system! For security reasons, please set a new personal password before accessing your account.
                    </Alert>

                    {error && <Alert severity="error">{error}</Alert>}

                    <PasswordField
                        fullWidth
                        label="New Password (min 6 characters)"
                        name="newPassword"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        inputRef={newPasswordInputRef}
                        disabled={loading}
                    />

                    <PasswordField
                        fullWidth
                        label="Confirm New Password"
                        name="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={loading}
                    />

                    {/* Terms and Privacy Agreement Checkbox */}
                    <Box sx={{ mt: 0.5 }}>
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
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2, flexDirection: 'column', gap: 1 }}>
                    <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        fullWidth
                        disabled={loading}
                        sx={{ minHeight: 44, fontWeight: 700 }}
                    >
                        {loading ? <CircularProgress size={20} color="inherit" /> : 'Set New Password & Continue'}
                    </Button>
                    <Button
                        variant="text"
                        color="inherit"
                        size="small"
                        onClick={logout}
                        disabled={loading}
                        sx={{ color: 'text.secondary', fontWeight: 600 }}
                    >
                        Log out and return to sign in
                    </Button>
                </DialogActions>
            </Box>

            <LegalModal
                open={legalModalOpen}
                onClose={() => setLegalModalOpen(false)}
                defaultTab={legalDefaultTab}
            />
        </Dialog>
    );
}
