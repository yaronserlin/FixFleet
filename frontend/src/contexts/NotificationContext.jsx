// src/contexts/NotificationContext.jsx
import React, { createContext, useContext, useState, useMemo } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { BOTTOM_NAV_HEIGHT } from '../components/Navbar/navConstants';

// Create notification context
const NotificationContext = createContext();

export function NotificationProvider({ children }) {
    const [open, setOpen] = useState(false);
    const [messageInfo, setMessageInfo] = useState({ message: '', severity: 'info' });

    const handleClose = (event, reason) => {
        if (reason === 'clickaway') return;
        setOpen(false);
    };

    // Memoized notify API to ensure stable identity
    const notify = useMemo(() => ({
        success: (msg) => { setMessageInfo({ message: msg, severity: 'success' }); setOpen(true); },
        error: (msg) => { setMessageInfo({ message: msg, severity: 'error' }); setOpen(true); },
        info: (msg) => { setMessageInfo({ message: msg, severity: 'info' }); setOpen(true); },
        warning: (msg) => { setMessageInfo({ message: msg, severity: 'warning' }); setOpen(true); },
    }), []);

    return (
        <NotificationContext.Provider value={notify}>
            {children}
            <Snackbar
                open={open}
                autoHideDuration={6000}
                onClose={handleClose}
                // Right-anchored so it never sits over the fixed left sidebar
                // rail (tablet/desktop); the `bottom` override on phone clears
                // the fixed bottom nav bar (+ its safe-area inset) instead of
                // colliding with it at the default 8px offset.
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                sx={{
                    bottom: {
                        xs: `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px) + 12px)`,
                        sm: 24,
                    },
                }}
            >
                <Alert onClose={handleClose} severity={messageInfo.severity} variant="filled" sx={{ width: '100%' }}>
                    {messageInfo.message}
                </Alert>
            </Snackbar>
        </NotificationContext.Provider>
    );
}

export function useNotify() {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotify must be used within NotificationProvider');
    return context;
}