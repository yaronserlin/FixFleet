import React, { useEffect, useState, useCallback } from 'react';
import { Box, Button, Alert } from '@mui/material';

import useForm from '../../../hooks/useForm';
import Input from '../../Form/Input';
import {
    validateName,
    validateEmail,
    validatePassword,
    validateRole,
} from '../../../utils/validate';
import { DEFAULT_ROLE } from '../../../constants/roles';

const CREATE_USER_INITIAL = Object.freeze({
    name: '',
    email: '',
    password: '',
    role: DEFAULT_ROLE,
});

/**
 * @param {{ name: string; email: string; password?: string; role: string }} initialValues
 * @param {(vals: object) => Promise} onSubmit
 * @param {string} submitLabel
 */
function UserForm({ initialValues, onSubmit, submitLabel = 'Submit' }) {
    const [serverError, setServerError] = useState('');

    const {
        values,
        errors,
        isSubmitting,
        handleChange,
        handleSubmit,
        resetForm,
        setValues,
    } = useForm({
        initialValues,
        validate: validateUser,
        onSubmit: async (vals) => {
            setServerError('');
            try {
                await onSubmit(vals);
                if (submitLabel.toLowerCase() === 'create') {
                    resetForm();
                }
            } catch (err) {
                setServerError(err.message || 'Submission failed');
            }
        },
    });

    // Sync only when initialValues actually changes identity (e.g. switching users to edit)
    useEffect(() => {
        setValues(initialValues);
    }, [initialValues, setValues]);

    const handleFieldChange = useCallback(
        (e) => {
            if (serverError) setServerError('');
            handleChange(e);
        },
        [handleChange, serverError]
    );

    return (
        <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        >
            {serverError && <Alert severity="error">{serverError}</Alert>}

            <Input.Text
                name="name"
                label="Name"
                value={values.name}
                onChange={handleFieldChange}
                error={Boolean(errors.name)}
                helperText={errors.name}
                required
            />

            <Input.Email
                name="email"
                label="Email"
                value={values.email}
                onChange={handleFieldChange}
                error={Boolean(errors.email)}
                helperText={errors.email}
                required
            />

            <Input.Password
                name="password"
                label="Password"
                value={values.password}
                onChange={handleFieldChange}
                error={Boolean(errors.password)}
                helperText={errors.password}
                required={submitLabel.toLowerCase() === 'create'}
            />

            <Alert severity="info" sx={{ fontSize: '0.8rem', py: 0.5 }}>
                New accounts are created as <strong>Operators</strong> by default. You can update their role anytime from the User Management table.
            </Alert>

            <Button
                type="submit"
                variant="contained"
                disabled={isSubmitting}
                sx={{ mt: 2 }}
            >
                {isSubmitting ? `${submitLabel}…` : submitLabel}
            </Button>
        </Box>
    );
}

/** field‐level validation for all user fields */
function validateUser(vals) {
    const errs = {};
    const nameErr = validateName(vals.name);
    if (nameErr) errs.name = nameErr;

    const emailErr = validateEmail(vals.email);
    if (emailErr) errs.email = emailErr;

    if (vals.password) {
        const pwdErr = validatePassword(vals.password);
        if (pwdErr) errs.password = pwdErr;
    }

    const roleErr = validateRole(vals.role);
    if (roleErr) errs.role = roleErr;

    return errs;
}

/** Blank form for creating a new user */
export function CreateUserForm({ onSubmit }) {
    return (
        <UserForm
            initialValues={CREATE_USER_INITIAL}
            onSubmit={onSubmit}
            submitLabel="Create"
        />
    );
}

/** Pre-filled form for updating an existing user */
export function UpdateUserForm({ initialValues, onSubmit }) {
    return (
        <UserForm
            initialValues={initialValues}
            onSubmit={onSubmit}
            submitLabel="Update"
        />
    );
}

export default UserForm;
