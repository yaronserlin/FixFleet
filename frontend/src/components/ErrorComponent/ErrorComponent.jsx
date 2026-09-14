import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, Button, Alert } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined';

/**
 * A reusable component to display error messages with an optional retry action.
 *
 * @param {object} props
 * @param {string|Error} props.message - The error message or Error object to display.
 * @param {() => void} [props.onRetry] - Optional callback function for retry action.
 */
export default function ErrorComponent({ message, onRetry }) {
    const text = message instanceof Error ? message.message : message;
    console.error('ErrorComponent:', text);

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: 4,
                width: '70%',
                backgroundColor: 'background.paper',
                borderRadius: 2,
                textAlign: 'center',
            }}
        >
            <ErrorOutlineIcon sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
            <Typography variant="h6" component="p" gutterBottom>
                {text}

            </Typography>
            {onRetry && (
                <Button variant="contained" color="primary" onClick={onRetry} sx={{ mt: 2 }}>
                    Retry
                </Button>
            )}
        </Box>
    );
}

ErrorComponent.propTypes = {
    message: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Error)]),
    onRetry: PropTypes.func,
};

ErrorComponent.defaultProps = {
    message: 'Something went wrong. Please try again later.',
    onRetry: null,
};
