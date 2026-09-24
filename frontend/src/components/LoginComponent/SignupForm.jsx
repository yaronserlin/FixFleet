// src/components/LoginComponent/SignupForm.jsx
import React, { useState } from 'react';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import BusinessIcon from '@mui/icons-material/Business';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { useAuth } from '../../contexts/AuthContext';
import useForm from '../../hooks/useForm';
import { validateName, validateEmail, validatePassword } from '../../utils/validate';
import LegalModal from '../Legal/LegalModal';
import PasswordField from '../Form/PasswordField';

function validateSignup(vals) {
    const errs = {};
    if (!vals.companyName || vals.companyName.trim().length < 2) {
        errs.companyName = 'Company name must be at least 2 characters';
    }
    const nameErr = validateName(vals.name);
    if (nameErr) errs.name = nameErr;
    const emailErr = validateEmail(vals.email);
    if (emailErr) errs.email = emailErr;
    const pwdErr = validatePassword(vals.password);
    if (pwdErr) errs.password = pwdErr;
    if (!vals.agreeToTerms) {
        errs.agreeToTerms = 'You must agree to the Terms of Service and Privacy Policy to register';
    }
    return errs;
}

export default function SignupForm() {
    const { signup, loading } = useAuth();
    const [serverError, setServerError] = useState('');
    const [legalModalOpen, setLegalModalOpen] = useState(false);
    const [legalDefaultTab, setLegalDefaultTab] = useState('terms');

    const { values, errors, isSubmitting, handleChange, handleSubmit, resetForm } = useForm({
        initialValues: { companyName: '', name: '', email: '', password: '', agreeToTerms: false },
        validate: validateSignup,
        onSubmit: async (vals) => {
            setServerError('');
            try {
                await signup(vals);
                resetForm();
            } catch (err) {
                setServerError(err.message || 'Sign up failed. Please try again.');
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

            {/* Company Name */}
            <TextField
                name="companyName"
                label="Company name"
                value={values.companyName}
                onChange={handleInputChange}
                required
                fullWidth
                error={Boolean(errors.companyName)}
                helperText={errors.companyName}
                slotProps={{ input: {
                    startAdornment: (
                        <InputAdornment position="start">
                            <BusinessIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                        </InputAdornment>
                    ),
                } }}
            />

            {/* Full Name */}
            <TextField
                name="name"
                label="Admin full name"
                autoComplete="name"
                value={values.name}
                onChange={handleInputChange}
                required
                fullWidth
                error={Boolean(errors.name)}
                helperText={errors.name}
                slotProps={{ input: {
                    startAdornment: (
                        <InputAdornment position="start">
                            <PersonIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                        </InputAdornment>
                    ),
                } }}
            />

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
                autoComplete="new-password"
                value={values.password}
                onChange={handleInputChange}
                required
                fullWidth
                error={Boolean(errors.password)}
                helperText={errors.password}
                startAdornment={<LockIcon sx={{ fontSize: 18, color: 'text.disabled' }} />}
            />

            {/* Terms and Privacy Agreement */}
            <Box sx={{ mt: -0.5 }}>
                <FormControlLabel
                    control={
                        <Checkbox
                            name="agreeToTerms"
                            checked={Boolean(values.agreeToTerms)}
                            onChange={(e) => {
                                if (serverError) setServerError('');
                                handleChange({
                                    target: {
                                        name: 'agreeToTerms',
                                        value: e.target.checked,
                                    },
                                });
                            }}
                            color="primary"
                            size="small"
                            disabled={busy}
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
                {errors.agreeToTerms && (
                    <FormHelperText error sx={{ ml: 3.5, mt: -0.5 }}>
                        {errors.agreeToTerms}
                    </FormHelperText>
                )}
            </Box>

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
                }}
            >
                {busy ? (
                    <CircularProgress size={20} thickness={5} sx={{ color: 'rgba(255,255,255,0.8)' }} />
                ) : 'Create Company Account'}
            </Button>

            <LegalModal
                open={legalModalOpen}
                onClose={() => setLegalModalOpen(false)}
                defaultTab={legalDefaultTab}
            />
        </Box>
    );
}
