import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, TextField } from '@mui/material';
import useForm from '../../../hooks/useForm';
import { isRequired } from '../../../utils/validate';

const BLANK_TOOL_VALUES = Object.freeze({
    name: '',
    serialNumber: '',
    localSerialNumber: '',
    model: '',
    description: '',
});

function validateTool(vals) {
    const errs = {};
    const nameErr = isRequired(vals.name, 'Name');
    if (nameErr) errs.name = nameErr;
    return errs;
}

// Generic form fields component (used by both create and update forms)
function ToolFormFields({ values, errors, onChange }) {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
                label="Name"
                name="name"
                required
                value={values.name}
                onChange={onChange}
                error={Boolean(errors.name)}
                helperText={errors.name}
            />
            <TextField
                label="Serial Number"
                name="serialNumber"
                value={values.serialNumber}
                onChange={onChange}
            />
            <TextField
                label="Local Serial Number"
                name="localSerialNumber"
                value={values.localSerialNumber}
                onChange={onChange}
            />
            <TextField
                label="Model"
                name="model"
                value={values.model}
                onChange={onChange}
            />
            <TextField
                label="Description"
                name="description"
                multiline
                rows={4}
                value={values.description}
                onChange={onChange}
            />
        </Box>
    );
}

/**
 * Shared implementation for the create/update equipment forms: wires
 * useForm + validateTool for field-level errors, disables submit while
 * invalid/submitting, and maps a thrown submit error back into an
 * inline Alert (in addition to whatever toast the caller may also fire).
 */
function ToolForm({ initialValues, onSubmit, onCancel, submitLabel }) {
    const [serverError, setServerError] = useState('');

    const { values, errors, isSubmitting, handleChange, handleSubmit, setValues } = useForm({
        initialValues,
        validate: validateTool,
        onSubmit: async (vals) => {
            setServerError('');
            try {
                await onSubmit(vals);
            } catch (err) {
                setServerError(err?.response?.data?.message || err?.message || 'Failed to save equipment');
            }
        },
    });

    // Re-sync when switching which tool is being edited (or when the dialog re-opens for create)
    useEffect(() => {
        setValues(initialValues);
    }, [initialValues, setValues]);

    const handleFieldChange = (e) => {
        if (serverError) setServerError('');
        handleChange(e);
    };

    const isNameBlank = !values.name || !values.name.trim();

    return (
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ p: 1, maxWidth: 600 }}>
            {serverError && (
                <Alert severity="error" onClose={() => setServerError('')} sx={{ mb: 2 }}>
                    {serverError}
                </Alert>
            )}
            <ToolFormFields values={values} errors={errors} onChange={handleFieldChange} />
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1.5 }}>
                {onCancel && (
                    <Button variant="outlined" onClick={onCancel} disabled={isSubmitting}>
                        Cancel
                    </Button>
                )}
                <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={isSubmitting || isNameBlank}
                >
                    {isSubmitting ? `${submitLabel}…` : submitLabel}
                </Button>
            </Box>
        </Box>
    );
}

// Create Tool Form Component
export function CreateToolForm({ onSubmit, onCancel }) {
    return (
        <ToolForm
            initialValues={BLANK_TOOL_VALUES}
            onSubmit={onSubmit}
            onCancel={onCancel}
            submitLabel="Create Equipment"
        />
    );
}

// Update Tool Form Component
export function UpdateToolForm({ initialData = {}, onSubmit, onCancel }) {
    // Only recompute (and thus re-sync ToolForm's values) when the underlying
    // record identity actually changes, not on every parent re-render.
    const initialValues = useMemo(() => ({
        name: initialData.name || '',
        serialNumber: initialData.serialNumber || '',
        localSerialNumber: initialData.localSerialNumber || '',
        model: initialData.model || '',
        description: initialData.description || '',
    }), [initialData]);

    return (
        <ToolForm
            initialValues={initialValues}
            onSubmit={onSubmit}
            onCancel={onCancel}
            submitLabel="Update Equipment"
        />
    );
}

// Equipment aliases
export const EquipmentFormFields = ToolFormFields;
export const CreateEquipmentForm = CreateToolForm;
export const UpdateEquipmentForm = UpdateToolForm;
