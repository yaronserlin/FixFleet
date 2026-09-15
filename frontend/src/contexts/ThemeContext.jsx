import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { getAppTheme } from '../theme';

const ThemeContext = createContext({
    mode: 'light',
    toggleColorMode: () => {},
});

export function ThemeModeProvider({ children }) {
    const [mode, setMode] = useState(() => {
        try {
            const saved = localStorage.getItem('maintenance_app_theme');
            if (saved === 'dark' || saved === 'light') return saved;
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                return 'dark';
            }
        } catch {
            // fallback
        }
        return 'light';
    });

    useEffect(() => {
        try {
            localStorage.setItem('maintenance_app_theme', mode);
            document.documentElement.setAttribute('data-theme', mode);
        } catch {
            // ignore
        }
    }, [mode]);

    const toggleColorMode = useCallback(() => {
        setMode(prev => (prev === 'light' ? 'dark' : 'light'));
    }, []);

    const theme = useMemo(() => getAppTheme(mode), [mode]);

    const contextValue = useMemo(() => ({
        mode,
        toggleColorMode,
    }), [mode, toggleColorMode]);

    return (
        <ThemeContext.Provider value={contextValue}>
            <MuiThemeProvider theme={theme}>
                <CssBaseline />
                {children}
            </MuiThemeProvider>
        </ThemeContext.Provider>
    );
}

export function useThemeMode() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useThemeMode must be used within ThemeModeProvider');
    }
    return context;
}
