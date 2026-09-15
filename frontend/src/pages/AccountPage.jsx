// src/pages/AccountPage.jsx
import React, { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Box,
    TextField,
    Button,
    Alert,
    Avatar,
    IconButton,
    CircularProgress,
    Paper,
    InputAdornment,
} from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import PersonIcon from '@mui/icons-material/Person';
import SecurityIcon from '@mui/icons-material/Security';
import { styled } from '@mui/material/styles';
import { useAuth } from '../contexts/AuthContext';
import userService from '../services/userService';
import { getMediaUrl } from '../utils/mediaUtils';
import { formatUserName, getUserInitials } from '../utils/formatUtils';
import { validateEmail, validatePassword } from '../utils/validate';

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
    const { user, setUser, updateAvatar } = useAuth();
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

    // Password visibility toggles
    const [showCurrentPwd, setShowCurrentPwd] = useState(false);
    const [showNewPwd, setShowNewPwd] = useState(false);
    const [showConfirmPwd, setShowConfirmPwd] = useState(false);
    const [emailPassword, setEmailPassword] = useState('');
    const [showEmailPassword, setShowEmailPassword] = useState(false);

    useEffect(() => {
        if (user) setForm({ name: formatUserName(user.name) || '', email: user.email || '' });
    }, [user]);

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

    return (
        <Container maxWidth="sm" sx={{ mt: 3, mb: 6 }}>
            <Box mb={3.5}>
                <Typography variant="h4" fontWeight={800} letterSpacing="-0.02em">
                    Account Settings
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Manage your personal profile, photo, and login security credentials
                </Typography>
            </Box>

            {/* Profile Avatar Card */}
            <Paper
                variant="outlined"
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    mb: 3.5,
                    p: 3,
                    borderRadius: 3,
                    borderLeft: '4px solid #2563EB',
                }}
            >
                <Box position="relative">
                    <Avatar
                        src={getMediaUrl(user?.avatar)}
                        alt={formatUserName(user?.name) || 'User'}
                        sx={{
                            width: 80,
                            height: 80,
                            fontSize: '2rem',
                            fontWeight: 800,
                            bgcolor: 'primary.main',
                            color: 'primary.contrastText',
                        }}
                    >
                        {getUserInitials(user?.name)}
                    </Avatar>
                    {avatarLoading && (
                        <CircularProgress
                            size={80}
                            sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                zIndex: 1,
                                color: 'primary.main',
                            }}
                        />
                    )}
                </Box>
                <Box>
                    <Typography variant="subtitle1" fontWeight={700}>
                        Profile Photo
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                        JPG, PNG, GIF up to 5MB
                    </Typography>
                    <Box display="flex" gap={1.25} flexWrap="wrap">
                        <Button
                            component="label"
                            variant="contained"
                            size="small"
                            color="primary"
                            startIcon={<PhotoCameraIcon />}
                            disabled={avatarLoading}
                            sx={{ fontWeight: 600 }}
                        >
                            Take Photo
                            <VisuallyHiddenInput
                                type="file"
                                accept="image/*"
                                capture="user"
                                onChange={handleAvatarChange}
                            />
                        </Button>
                        <Button
                            component="label"
                            variant="outlined"
                            size="small"
                            color="primary"
                            disabled={avatarLoading}
                            sx={{ fontWeight: 600 }}
                        >
                            Upload Photo
                            <VisuallyHiddenInput
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarChange}
                            />
                        </Button>
                    </Box>
                </Box>
            </Paper>

            {/* Personal Information */}
            <Paper
                variant="outlined"
                sx={{
                    p: 3,
                    mb: 3.5,
                    borderRadius: 3,
                    borderLeft: '4px solid #2563EB',
                }}
            >
                <Box component="form" onSubmit={handleUpdateProfile}>
                    <Box display="flex" alignItems="center" gap={1.25} mb={0.5}>
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
                        <TextField
                            fullWidth
                            label="Current Password"
                            name="emailPassword"
                            type={showEmailPassword ? 'text' : 'password'}
                            value={emailPassword}
                            onChange={(e) => setEmailPassword(e.target.value)}
                            helperText="Your current password is required to verify email address change"
                            sx={{ mb: 2.5 }}
                            required
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() => setShowEmailPassword(prev => !prev)}
                                            edge="end"
                                            size="small"
                                            aria-label="toggle current password visibility"
                                        >
                                            {showEmailPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
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
                    <Box display="flex" alignItems="center" gap={1.25} mb={0.5}>
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
                    <TextField
                        fullWidth
                        label="Current Password"
                        name="currentPassword"
                        type={showCurrentPwd ? 'text' : 'password'}
                        value={pwd.currentPassword}
                        onChange={handlePwdChange}
                        sx={{ mb: 2 }}
                        required
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        size="small"
                                        onClick={() => setShowCurrentPwd(v => !v)}
                                        edge="end"
                                    >
                                        {showCurrentPwd ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />

                    {/* New Password */}
                    <TextField
                        fullWidth
                        label="New Password"
                        name="newPassword"
                        type={showNewPwd ? 'text' : 'password'}
                        value={pwd.newPassword}
                        onChange={handlePwdChange}
                        sx={{ mb: strength > 0 ? 1 : 2 }}
                        required
                        error={Boolean(pwdFieldErrors.newPassword)}
                        helperText={pwdFieldErrors.newPassword}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        size="small"
                                        onClick={() => setShowNewPwd(v => !v)}
                                        edge="end"
                                    >
                                        {showNewPwd ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />

                    {/* Password Strength Indicator */}
                    {strength > 0 && (
                        <Box sx={{ mb: 2 }}>
                            <Box display="flex" gap={0.5} mb={0.5}>
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
                    <TextField
                        fullWidth
                        label="Confirm New Password"
                        name="confirm"
                        type={showConfirmPwd ? 'text' : 'password'}
                        value={pwd.confirm}
                        onChange={handlePwdChange}
                        sx={{ mb: 2.5 }}
                        required
                        error={Boolean(pwdFieldErrors.confirm)}
                        helperText={pwdFieldErrors.confirm}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        size="small"
                                        onClick={() => setShowConfirmPwd(v => !v)}
                                        edge="end"
                                    >
                                        {showConfirmPwd ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
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
        </Container>
    );
}
