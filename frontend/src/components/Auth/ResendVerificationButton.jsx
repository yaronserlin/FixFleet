// src/components/Auth/ResendVerificationButton.jsx
import React, { useState } from 'react';
import Button from '@mui/material/Button';
import userService from '../../services/userService';

const LABELS = {
    idle: 'Resend email',
    sending: 'Sending…',
    sent: 'Email sent',
    failed: 'Failed, retry',
};

/**
 * Re-sends the signup verification email for `email`. The server answers the
 * same for every address, so success only means "requested".
 */
export default function ResendVerificationButton({ email }) {
    const [state, setState] = useState('idle'); // idle | sending | sent | failed

    const handleClick = async () => {
        setState('sending');
        try {
            await userService.resendVerification(email);
            setState('sent');
        } catch {
            setState('failed');
        }
    };

    return (
        <Button
            size="small"
            color="inherit"
            onClick={handleClick}
            disabled={!email || state === 'sending' || state === 'sent'}
            sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}
        >
            {LABELS[state]}
        </Button>
    );
}
