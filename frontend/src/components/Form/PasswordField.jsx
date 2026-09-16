import React, { forwardRef, useState } from 'react';
import {
    FormControl,
    FormHelperText,
    IconButton,
    InputAdornment,
    InputLabel,
    OutlinedInput,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

const PasswordField = forwardRef(({
    label = 'Password',
    helperText,
    error,
    required,
    startAdornment,
    containerSx,
    id,
    name,
    ...props
}, ref) => {
    const [show, setShow] = useState(false);
    const inputId = id || name || 'password-input';
    const helperId = `${inputId}-helper-text`;

    return (
        <FormControl fullWidth variant="outlined" required={required} error={Boolean(error)} sx={containerSx}>
            <InputLabel htmlFor={inputId}>{label}</InputLabel>
            <OutlinedInput
                id={inputId}
                name={name}
                inputRef={ref}
                type={show ? 'text' : 'password'}
                error={Boolean(error)}
                aria-describedby={helperText ? helperId : undefined}
                startAdornment={startAdornment ? <InputAdornment position="start">{startAdornment}</InputAdornment> : undefined}
                endAdornment={(
                    <InputAdornment position="end">
                        <IconButton
                            type="button"
                            aria-label={show ? 'Hide password' : 'Show password'}
                            onClick={() => setShow((previous) => !previous)}
                            edge="end"
                        >
                            {show ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                    </InputAdornment>
                )}
                label={label}
                {...props}
            />
            {helperText && <FormHelperText id={helperId}>{helperText}</FormHelperText>}
        </FormControl>
    );
});

PasswordField.displayName = 'PasswordField';

export default PasswordField;
