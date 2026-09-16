// src/components/Form/Input.jsx
import React, { forwardRef } from 'react';
import {
    TextField,
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';
import PasswordField from './PasswordField';

/**
 * Factory to create a MUI TextField wrapper with fixed type and default label.
 */
function createInputComponent(type, defaultLabel) {
    const Component = forwardRef(({ label = defaultLabel, helperText, error, ...props }, ref) => (
        <TextField
            fullWidth
            variant={props.variant || "outlined"}
            label={label}
            type={type}
            inputRef={ref}
            error={!!error}
            helperText={helperText}
            {...props}
        />
    ));
    Component.displayName = `${defaultLabel.replace(/\s+/g, '')}Input`;
    return Component;
}

/**
 * Select input component with options and accessible helper text.
 */
const SelectInput = forwardRef(({ label, options = [], helperText, error, id, name, ...props }, ref) => {
    const labelId = `${id || name || 'select'}-label`;
    const helperId = `${id || name || 'select'}-helper-text`;

    return (
        <FormControl fullWidth variant="outlined" error={!!error}>
            <InputLabel id={labelId}>{label}</InputLabel>
            <Select
                labelId={labelId}
                inputRef={ref}
                label={label}
                error={!!error}
                aria-describedby={helperText ? helperId : undefined}
                {...props}
            >
                {options.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                        {option.label}
                    </MenuItem>
                ))}
            </Select>
            {helperText && (
                <FormHelperText id={helperId}>
                    {helperText}
                </FormHelperText>
            )}
        </FormControl>
    );
});
SelectInput.displayName = 'SelectInput';

const Email = createInputComponent('email', 'Email');
const Text = createInputComponent('text', 'Text');
const NumberInput = createInputComponent('number', 'Number');
const Url = createInputComponent('url', 'URL');

const Input = {
    Email,
    Password: PasswordField,
    Text,
    Number: NumberInput,
    Url,
    Select: SelectInput,
};

export default Input;
