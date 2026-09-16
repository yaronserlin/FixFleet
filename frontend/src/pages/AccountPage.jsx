// src/pages/AccountPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    Container,
    Typography,
    Box,
    TextField,
    Button,
    Alert,
    Avatar,
    CircularProgress,
    Paper,
    Skeleton,
    Switch,
    FormControlLabel,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Divider,
} from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import PersonIcon from '@mui/icons-material/Person';
import SecurityIcon from '@mui/icons-material/Security';
import PaletteIcon from '@mui/icons-material/Palette';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { styled } from '@mui/material/styles';
import { useAuth } from '../contexts/AuthContext';
import { useThemeMode } from '../contexts/ThemeContext';
import userService from '../services/userService';
import { getMediaUrl } from '../utils/mediaUtils';
import { formatUserName, getUserInitials } from '../utils/formatUtils';
import { validateEmail, validatePassword } from '../utils/validate';
import { usePageRefresh } from '../contexts/PageRefreshContext';
import PushNotificationSettings from '../components/Notifications/PushNotificationSettings';
import { FormSkeleton } from '../components/Skeletons/Skeletons';
import { skeletonA11yProps } from '../components/Skeletons/skeletonA11y';
import PasswordField from '../components/Form/PasswordField';

const VisuallyHiddenInput = styled('input')({
    clip: 'rect(0 0 0 0)',
    clipPath: 'inset(50%)',
    height: 1,
    overflow: 'hidden',
    position: 'absolute',
    bottom: 0,
    left: 0,
    whiteSpace: 'nowrap',
    width: 1,
});

export default function AccountPage() {
    const { user, setUser, updateAvatar, logout } = useAuth();
    const { mode, toggleColorMode } = useThemeMode();
    const [form, setForm] = useState({ name: '', email: '' });
    const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirm: '' });

    // Separate alert states for personal info vs password forms
    const [profileMsg, setProfileMsg] = useState(null);
    const [profileError, setProfileError] = useState(null);
    const [pwdMsg, setPwdMsg] = useState(null);
    const [pwdError, setPwdError] = useState(null);

    // Field-level validation errors, shown inline on the relevant TextField
    const [profileFieldErrors, setProfileFieldErrors] = useState({});
    const [pwdFieldErrors, setPwdFieldErrors] = useState({});

    const [loadingProfile, setLoadingProfile] = useState(false);
    const [loadingPwd, setLoadingPwd] = useState(false);
    const [avatarLoading, setAvatarLoading] = useState(false);

    const [emailPassword, setEmailPassword] = useState('');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState('');
    const [deleteError, setDeleteError] = useState(null);
    const [deletingAccount, setDeletingAccount] = useState(false);

    useEffect(() => {
        if (user) setForm({ name: formatUserName(user.name) || '', email: user.email || '' });
    }, [user]);

    // Pull down to re-read the profile from the server -- this page renders
    // straight off the auth context, so refreshing that refreshes the page.
    const handleRefresh = useCallback(async () => {
        try {
            const { data } = await userService.getProfile();
            if (data) setUser(prev => ({ ...prev, ...data }));
        } catch (err) {
            console.error('Failed to refresh profile:', err);
        }
    }, [setUser]);

    usePageRefresh(handleRefresh);

    const handleChange = e => {
        const { name, value } = e.target;
        if (profileFieldErrors[name]) {
            setProfileFieldErrors(prev => ({ ...prev, [name]: undefined }));
        }
        setForm(prev => ({ ...prev, [name]: value }));
    };
    const handlePwdChange = e => {
        const { name, value } = e.target;
        if (pwdFieldErrors[name]) {
            setPwdFieldErrors(prev => ({ ...prev, [name]: undefined }));
        }
        setPwd(prev => ({ ...prev, [name]: value }));
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setAvatarLoading(true);
        setProfileMsg(null);
        setProfileError(null);
        try {
            if (updateAvatar) {
                await updateAvatar(file);
            } else {
                const { data } = await userService.uploadAvatar(file);
                setUser(prev => ({ ...prev, ...data }));
            }
            setProfileMsg('Profile picture updated successfully');
        } catch (err) {
            setProfileError(err.response?.data?.message || 'Failed to upload profile picture');
        } finally {
            setAvatarLoading(false);
        }
    };

    const isEmailChanged = Boolean(
        user?.email &&
        form.email.trim().toLowerCase() !== user.email.trim().toLowerCase()
    );

    const handleUpdateProfile = async (e) => {
        if (e) e.preventDefault();

        const emailErr = validateEmail(form.email);
        if (emailErr) {
            setProfileFieldErrors({ email: emailErr });
            return;
        }
        setProfileFieldErrors({});

        if (isEmailChanged && !emailPassword) {
            setProfileError('Current password is required to confirm your email address change');
            return;
        }

        setLoadingProfile(true);
        setProfileMsg(null);
        setProfileError(null);
        try {
            const formattedName = formatUserName(form.name);
            const { data } = await userService.updateProfile({
                ...form,
                name: formattedName,
                currentPassword: isEmailChanged ? emailPassword : undefined,
            });
            setUser(prev => ({ ...prev, ...data, name: formattedName }));
            setForm(prev => ({ ...prev, name: formattedName }));
            setProfileMsg('Profile updated successfully');
            setEmailPassword('');
        } catch (err) {
            setProfileError(err.response?.data?.message || 'Update failed');
        } finally {
            setLoadingProfile(false);
        }
    };

    const handleChangePassword = async (e) => {
        if (e) e.preventDefault();

        const newPwdErr = validatePassword(pwd.newPassword);
        const confirmErr = pwd.newPassword !== pwd.confirm ? 'Passwords do not match' : '';
        if (newPwdErr || confirmErr) {
            setPwdFieldErrors({ newPassword: newPwdErr, confirm: confirmErr });
            return;
        }
        setPwdFieldErrors({});

        setLoadingPwd(true);
        setPwdMsg(null);
        setPwdError(null);
        try {
            const { data } = await userService.changePassword({
                currentPassword: pwd.currentPassword,
                newPassword: pwd.newPassword,
            });
            setPwdMsg(data.message || 'Password changed successfully');
            setPwd({ currentPassword: '', newPassword: '', confirm: '' });
        } catch (err) {
            setPwdError(err.response?.data?.message || 'Password change failed');
            setPwd({ currentPassword: '', newPassword: '', confirm: '' });
        } finally {
            setLoadingPwd(false);
        }
    };

    const expectedDeleteConfirmation = `delete ${formatUserName(user.name)}`;
    const isDeleteConfirmationValid = deleteConfirmation.trim().toLowerCase() === expectedDeleteConfirmation.toLowerCase();

    const handleDeleteAccount = async () => {
        if (!isDeleteConfirmationValid) return;

        setDeletingAccount(true);
        setDeleteError(null);
        try {
            await userService.deleteAccount(deleteConfirmation);
            await logout();
        } catch (err) {
            setDeleteError(err.response?.data?.message || 'Account deletion failed');
            setDeletingAccount(false);
        }
    };

    // Calculate password strength
    const getStrength = (val) => {
        if (!val) return 0;
        if (val.length < 6) return 1;
        if (val.length < 8) return 2;
        if (val.length < 12) return 3;
        return 4;
    };
    const strength = getStrength(pwd.newPassword);
    const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    const strengthColors = ['', '#DC2626', '#F59E0B', '#F59E0B', '#16A34A'];

    // Rendered straight from the auth context: until the user object lands,
    // trace the avatar card + the two forms rather than flashing an empty page.
    if (!user) {
        return (
            <Container maxWidth="sm" sx={{ mt: 3, mb: 6 }} {...skeletonA11yProps('Loading account settings')}>
                <Box sx={{ mb: 3.5 }}>
                    <Skeleton variant="text" width={240} height={44} />
                    <Skeleton variant="text" width="80%" height={22} />
                </Box>
                <Paper variant="outlined" sx={{ display: 'flex', alignItems: 'center', gap: 3, p: 3, mb: 3.5, borderRadius: 3 }}>
                    <Skeleton variant="circular" width={80} height={80} />
                    <Box sx={{ flexGrow: 1 }}>
                        <Skeleton variant="text" width="60%" height={28} />
                        <Skeleton variant="text" width="45%" height={20} />
                    </Box>
                </Paper>
                <Paper variant="outlined" sx={{ p: 3, mb: 3.5, borderRadius: 3 }}>
                    <FormSkeleton fields={2} />
                </Paper>
                <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
                    <FormSkeleton fields={3} />
                </Paper>
            </Container>
        );
    }

    return (
        <Container maxWidth="sm" sx={{ mt: 3, mb: 6 }}>
            <Box sx={{ mb: 3.5 }}>
                <Typography variant="h4" fontWeight={800} letterSpacing="-0.02em">
                    Account Settings
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Manage your personal profile, photo, login security credentials, and alerts
                </Typography>
            </Box>

            {/* Avatar and personal details */}
            <Paper
                variant="outlined"
                sx={{ p: 3, mb: 3.5, borderRadius: 3, borderLeft: '4px solid #2563EB' }}
            >
                <Box component="form" onSubmit={handleUpdateProfile}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
                        <Box sx={{ position: 'relative', flexShrink: 0 }}>
                            <Avatar
                                src={getMediaUrl(user?.avatar)}
                                alt={formatUserName(user?.name) || 'User'}
                                sx={{ width: 80, height: 80, fontSize: '2rem', fontWeight: 800, bgcolor: 'primary.main', color: 'primary.contrastText' }}
                            >
                                {getUserInitials(user?.name)}
                            </Avatar>
                            {avatarLoading && <CircularProgress size={80} sx={{ position: 'absolute', top: 0, left: 0, zIndex: 1, color: 'primary.main' }} />}
                        </Box>
                        <Box>
                            <Typography variant="subtitle1" fontWeight={700}>Profile Photo</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>JPG, PNG, GIF up to 5MB</Typography>
                            <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap' }}>
                                <Button component="label" variant="contained" size="small" color="primary" startIcon={<PhotoCameraIcon />} disabled={avatarLoading} sx={{ fontWeight: 600 }}>
                                    Take Photo
                                    <VisuallyHiddenInput type="file" accept="image/*" capture="user" onChange={handleAvatarChange} />
                                </Button>
                                <Button component="label" variant="outlined" size="small" color="primary" disabled={avatarLoading} sx={{ fontWeight: 600 }}>
                                    Upload Photo
                                    <VisuallyHiddenInput type="file" accept="image/*" onChange={handleAvatarChange} />
                                </Button>
                            </Box>
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 0.5 }}>
                        <PersonIcon color="primary" />
                        <Typography variant="h6" fontWeight={700}>
                            Personal Information
                        </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Update your public display name and notification email address.
                    </Typography>

                    {profileMsg && <Alert severity="success" sx={{ mb: 2 }}>{profileMsg}</Alert>}
                    {profileError && <Alert severity="error" sx={{ mb: 2 }}>{profileError}</Alert>}

                    <TextField
                        fullWidth
                        label="Full Name"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        sx={{ mb: 2 }}
                        required
                    />
                    <TextField
                        fullWidth
                        label="Email Address"
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        sx={{ mb: isEmailChanged ? 2 : 2.5 }}
                        required
                        error={Boolean(profileFieldErrors.email)}
                        helperText={profileFieldErrors.email}
                    />

                    {isEmailChanged && (
                        <PasswordField
                            fullWidth
                            label="Current Password"
                            name="emailPassword"
                            value={emailPassword}
                            onChange={(e) => setEmailPassword(e.target.value)}
                            helperText="Your current password is required to verify email address change"
                            containerSx={{ mb: 2.5 }}
                            required
                        />
                    )}
                    <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        disabled={loadingProfile}
                        sx={{ minHeight: 44, fontWeight: 700 }}
                    >
                        {loadingProfile ? <CircularProgress size={20} color="inherit" /> : 'Save Changes'}
                    </Button>
                </Box>
            </Paper>

            {/* Security & Password */}
            <Paper
                variant="outlined"
                sx={{
                    p: 3,
                    borderRadius: 3,
                    borderLeft: '4px solid #F59E0B',
                }}
            >
                <Box component="form" onSubmit={handleChangePassword}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 0.5 }}>
                        <SecurityIcon sx={{ color: '#F59E0B' }} />
                        <Typography variant="h6" fontWeight={700}>
                            Security & Password
                        </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Ensure your account is protected with a secure and unique password.
                    </Typography>

                    {pwdMsg && <Alert severity="success" sx={{ mb: 2 }}>{pwdMsg}</Alert>}
                    {pwdError && <Alert severity="error" sx={{ mb: 2 }}>{pwdError}</Alert>}

                    {/* Current Password */}
                    <PasswordField
                        fullWidth
                        label="Current Password"
                        name="currentPassword"
                        value={pwd.currentPassword}
                        onChange={handlePwdChange}
                        containerSx={{ mb: 2 }}
                        required
                    />

                    {/* New Password */}
                    <PasswordField
                        fullWidth
                        label="New Password"
                        name="newPassword"
                        value={pwd.newPassword}
                        onChange={handlePwdChange}
                        containerSx={{ mb: strength > 0 ? 1 : 2 }}
                        required
                        error={Boolean(pwdFieldErrors.newPassword)}
                        helperText={pwdFieldErrors.newPassword}
                    />

                    {/* Password Strength Indicator */}
                    {strength > 0 && (
                        <Box sx={{ mb: 2 }}>
                            <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
                                {[1, 2, 3, 4].map(idx => (
                                    <Box
                                        key={idx}
                                        sx={{
                                            flex: 1,
                                            height: 4,
                                            borderRadius: 2,
                                            bgcolor: idx <= strength ? strengthColors[strength] : 'divider',
                                            transition: 'background-color 0.2s ease',
                                        }}
                                    />
                                ))}
                            </Box>
                            <Typography variant="caption" sx={{ color: strengthColors[strength], fontWeight: 600 }}>
                                Strength: {strengthLabels[strength]}
                            </Typography>
                        </Box>
                    )}

                    {/* Confirm Password */}
                    <PasswordField
                        fullWidth
                        label="Confirm New Password"
                        name="confirm"
                        value={pwd.confirm}
                        onChange={handlePwdChange}
                        containerSx={{ mb: 2.5 }}
                        required
                        error={Boolean(pwdFieldErrors.confirm)}
                        helperText={pwdFieldErrors.confirm}
                    />

                    <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        disabled={loadingPwd}
                        sx={{ minHeight: 44, fontWeight: 700 }}
                    >
                        {loadingPwd ? <CircularProgress size={20} color="inherit" /> : 'Update Password'}
                    </Button>
                </Box>
            </Paper>

            <Box sx={{ mt: 3.5, mb: 3.5 }}>
                <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 0.5 }}>
                    <PaletteIcon color="primary" />
                    <Typography variant="h6" fontWeight={700}>Appearance & Notifications</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                    Choose the color mode and notification preferences used on this device.
                </Typography>
                <FormControlLabel
                    sx={{ mt: 1.5, ml: 0, display: 'flex' }}
                    control={<Switch checked={mode === 'dark'} onChange={toggleColorMode} />}
                    label={mode === 'dark' ? 'Dark mode' : 'Light mode'}
                />
                </Paper>
                <Box sx={{ mt: 2 }}>
                    <PushNotificationSettings />
                </Box>
            </Box>

            <Paper
                variant="outlined"
                sx={{
                    p: 3,
                    mt: 3.5,
                    borderRadius: 3,
                    borderColor: 'error.main',
                    bgcolor: 'statusTint.error',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 0.5 }}>
                    <DeleteForeverIcon color="error" />
                    <Typography variant="h6" fontWeight={700} color="error.main">Danger Zone</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Permanently delete your account, sessions, push subscriptions, and profile photo. This action cannot be undone.
                </Typography>
                {deleteError && <Alert severity="error" sx={{ mb: 2 }}>{deleteError}</Alert>}
                <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteForeverIcon />}
                    onClick={() => {
                        setDeleteConfirmation('');
                        setDeleteError(null);
                        setDeleteDialogOpen(true);
                    }}
                    sx={{ fontWeight: 700 }}
                >
                    Delete Account
                </Button>
            </Paper>

            <Dialog
                open={deleteDialogOpen}
                onClose={() => !deletingAccount && setDeleteDialogOpen(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DeleteForeverIcon color="error" />
                    Delete your account?
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        This permanently removes your account and cannot be reversed. To continue, type <strong>{expectedDeleteConfirmation}</strong>.
                    </Typography>
                    <TextField
                        fullWidth
                        label="Confirmation"
                        value={deleteConfirmation}
                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                        disabled={deletingAccount}
                        error={Boolean(deleteConfirmation) && !isDeleteConfirmationValid}
                        helperText={deleteConfirmation && !isDeleteConfirmationValid ? `Type ${expectedDeleteConfirmation}` : ' '}
                    />
                </DialogContent>
                <Divider />
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={() => setDeleteDialogOpen(false)} disabled={deletingAccount}>Cancel</Button>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={handleDeleteAccount}
                        disabled={deletingAccount || !isDeleteConfirmationValid}
                        startIcon={<DeleteForeverIcon />}
                    >
                        {deletingAccount ? 'Deleting…' : 'Delete permanently'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
