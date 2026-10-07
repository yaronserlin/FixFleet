import { createTheme, alpha } from '@mui/material/styles';

/**
 * Industrial Blue Design System — FixFleet
 *
 * Design principles:
 *  – Blue (#2563EB) is the ONLY "clickable" color → all primary action buttons
 *  – Navy (#0F172A) is the brand identity color → logo, headings
 *  – Status colors (green / red / amber) reserved exclusively for operational meaning
 *  – Inter font, 8dp spacing rhythm, 12px card radius, 8px button radius
 *
 * @param {'light' | 'dark'} mode
 */
export const getAppTheme = (mode = 'light') => {
    const isDark = mode === 'dark';

    return createTheme({
        palette: {
            mode,
            primary: {
                // Action / accent blue — used for buttons, links, active states
                main:         isDark ? '#3B82F6' : '#2563EB',
                light:        isDark ? '#60A5FA' : '#3B82F6',
                dark:         isDark ? '#1D4ED8' : '#1D4ED8',
                contrastText: '#FFFFFF',
            },
            secondary: {
                // Brand navy — used for identity elements, not for actions
                main:         isDark ? '#94A3B8' : '#475569',
                light:        isDark ? '#CBD5E1' : '#64748B',
                dark:         isDark ? '#64748B' : '#334155',
                contrastText: isDark ? '#0F172A' : '#FFFFFF',
            },
            success: {
                main:         isDark ? '#22C55E' : '#16A34A',
                light:        isDark ? '#4ADE80' : '#22C55E',
                dark:         isDark ? '#15803D' : '#14532D',
                contrastText: '#FFFFFF',
            },
            warning: {
                main:         isDark ? '#F59E0B' : '#D97706',
                light:        isDark ? '#FBBF24' : '#F59E0B',
                dark:         isDark ? '#B45309' : '#92400E',
                contrastText: '#FFFFFF',
            },
            error: {
                main:         isDark ? '#F43F5E' : '#DC2626',
                light:        isDark ? '#FB7185' : '#F43F5E',
                dark:         isDark ? '#BE123C' : '#9F1239',
                contrastText: '#FFFFFF',
            },
            info: {
                main:         isDark ? '#38BDF8' : '#0284C7',
                light:        isDark ? '#7DD3FC' : '#38BDF8',
                dark:         isDark ? '#0369A1' : '#075985',
                contrastText: '#FFFFFF',
            },
            background: {
                default: isDark ? '#0B0F19' : '#F1F5F9',
                paper:   isDark ? '#111827' : '#FFFFFF',
                subtle:  isDark ? '#1E293B' : '#F8FAFC',
            },
            text: {
                primary:   isDark ? '#F8FAFC' : '#0F172A',
                secondary: isDark ? '#94A3B8' : '#475569',
                disabled:  isDark ? '#475569' : '#94A3B8',
            },
            divider: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',

            // Status-tint surfaces (used for card backgrounds)
            statusTint: {
                error:   isDark ? 'rgba(244,63,94,0.06)' : 'rgba(220,38,38,0.04)',
                success: isDark ? 'rgba(34,197,94,0.06)' : 'rgba(22,163,74,0.04)',
                warning: isDark ? 'rgba(245,158,11,0.06)' : 'rgba(217,119,6,0.04)',
            },
        },

        // ── Typography — Inter ──────────────────────────────────────
        typography: {
            fontFamily: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            h1: { fontWeight: 700, letterSpacing: '-0.025em' },
            h2: { fontWeight: 700, letterSpacing: '-0.02em' },
            h3: { fontWeight: 700, letterSpacing: '-0.02em' },
            h4: { fontWeight: 700, letterSpacing: '-0.02em' },
            h5: { fontWeight: 600, letterSpacing: '-0.015em' },
            h6: { fontWeight: 600, letterSpacing: '-0.01em' },
            subtitle1: { fontWeight: 500, letterSpacing: '-0.005em' },
            subtitle2: { fontWeight: 600, letterSpacing: '-0.005em' },
            body1: { lineHeight: 1.6 },
            body2: { lineHeight: 1.5 },
            button: {
                textTransform: 'none',
                fontWeight: 600,
                letterSpacing: '-0.005em',
            },
            caption: { letterSpacing: '0.01em' },
            overline: { fontWeight: 600, letterSpacing: '0.08em' },
        },

        // ── Shape ───────────────────────────────────────────────────
        shape: { borderRadius: 8 },

        // ── Component Overrides ─────────────────────────────────────
        components: {

            // ── CssBaseline ────────────────────────────────────────
            MuiCssBaseline: {
                styleOverrides: {
                    body: {
                        transition: 'background-color 0.2s ease, color 0.2s ease',
                    },
                },
            },

            // ── AppBar ─────────────────────────────────────────────
            MuiAppBar: {
                styleOverrides: {
                    root: {
                        backgroundImage: 'none',
                        backgroundColor: isDark ? alpha('#0F172A', 0.95) : alpha('#FFFFFF', 0.95),
                        backdropFilter: 'blur(8px)',
                        color: isDark ? '#F8FAFC' : '#0F172A',
                        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}`,
                        boxShadow: 'none',
                    },
                },
            },

            // ── Card ───────────────────────────────────────────────
            MuiCard: {
                defaultProps: { variant: 'outlined' },
                styleOverrides: {
                    root: {
                        borderRadius: 12,
                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
                        backgroundColor: isDark ? '#111827' : '#FFFFFF',
                        boxShadow: 'none',
                        transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
                        '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: isDark
                                ? '0 8px 24px rgba(0,0,0,0.5)'
                                : '0 8px 24px rgba(0,0,0,0.08)',
                        },
                    },
                },
            },

            // ── CardActionArea ─────────────────────────────────────
            MuiCardActionArea: {
                styleOverrides: {
                    root: {
                        // Prevent double hover transform
                        '&:hover .MuiCardActionArea-focusHighlight': { opacity: 0.04 },
                    },
                },
            },

            // ── Button ─────────────────────────────────────────────
            MuiButton: {
                defaultProps: { disableElevation: true },
                styleOverrides: {
                    root: {
                        borderRadius: 8,
                        minHeight: 44,
                        padding: '10px 20px',
                        boxShadow: 'none',
                        transition: 'background-color 0.15s ease, opacity 0.1s ease, transform 0.08s ease',
                        '&:hover':  { boxShadow: 'none', opacity: 0.92 },
                        '&:active': { transform: 'scale(0.98)' },
                        '&.Mui-disabled': { opacity: 0.4 },
                    },
                    sizeSmall: { minHeight: 36, padding: '6px 14px' },
                    sizeLarge: { minHeight: 52, padding: '14px 28px' },
                    contained: {
                        '&:hover': { boxShadow: 'none', opacity: 0.9 },
                    },
                    containedPrimary: {
                        backgroundColor: isDark ? '#3B82F6' : '#2563EB',
                        color: '#FFFFFF',
                        '&:hover': { backgroundColor: isDark ? '#2563EB' : '#1D4ED8' },
                    },
                    containedError: {
                        backgroundColor: isDark ? '#F43F5E' : '#DC2626',
                        color: '#FFFFFF',
                    },
                    containedSuccess: {
                        backgroundColor: isDark ? '#22C55E' : '#16A34A',
                        color: '#FFFFFF',
                    },
                    outlined: {
                        borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                        '&:hover': {
                            borderColor: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
                            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                        },
                    },
                    outlinedPrimary: {
                        borderColor: isDark ? '#3B82F6' : '#2563EB',
                        color: isDark ? '#3B82F6' : '#2563EB',
                        '&:hover': {
                            borderColor: isDark ? '#60A5FA' : '#1D4ED8',
                            backgroundColor: isDark ? 'rgba(59,130,246,0.08)' : 'rgba(37,99,235,0.06)',
                        },
                    },
                },
            },

            // ── IconButton ─────────────────────────────────────────
            MuiIconButton: {
                styleOverrides: {
                    root: {
                        borderRadius: 8,
                        transition: 'background-color 0.15s ease',
                        '&:active': { transform: 'scale(0.95)' },
                    },
                },
            },

            // ── TextField ──────────────────────────────────────────
            MuiTextField: {
                defaultProps: { variant: 'outlined' },
            },
            MuiOutlinedInput: {
                styleOverrides: {
                    root: {
                        borderRadius: 8,
                        transition: 'box-shadow 0.15s ease',
                        '&.Mui-focused': {
                            boxShadow: `0 0 0 3px ${isDark ? 'rgba(59,130,246,0.25)' : 'rgba(37,99,235,0.15)'}`,
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: isDark ? '#3B82F6' : '#2563EB',
                            borderWidth: 2,
                        },
                    },
                    notchedOutline: {
                        borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
                        transition: 'border-color 0.15s ease',
                    },
                },
            },
            MuiInputLabel: {
                styleOverrides: {
                    root: {
                        '&.Mui-focused': {
                            color: isDark ? '#3B82F6' : '#2563EB',
                        },
                    },
                },
            },

            // ── Chip ───────────────────────────────────────────────
            MuiChip: {
                styleOverrides: {
                    root: {
                        borderRadius: 6,
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        transition: 'background-color 0.15s ease, opacity 0.15s ease',
                        '&:hover': { opacity: 0.88 },
                    },
                    filledPrimary: {
                        backgroundColor: isDark ? '#2563EB' : '#2563EB',
                        color: '#FFFFFF',
                    },
                    filledSuccess: {
                        backgroundColor: isDark ? '#16A34A' : '#16A34A',
                        color: '#FFFFFF',
                    },
                    filledError: {
                        backgroundColor: isDark ? '#DC2626' : '#DC2626',
                        color: '#FFFFFF',
                    },
                    filledWarning: {
                        backgroundColor: isDark ? '#D97706' : '#D97706',
                        color: '#FFFFFF',
                    },
                },
            },

            // ── Paper ──────────────────────────────────────────────
            MuiPaper: {
                styleOverrides: {
                    root: { backgroundImage: 'none' },
                    outlined: {
                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                    },
                },
            },

            // ── Dialog ─────────────────────────────────────────────
            MuiDialog: {
                styleOverrides: {
                    paper: {
                        borderRadius: 16,
                        boxShadow: isDark
                            ? '0 24px 64px rgba(0,0,0,0.6)'
                            : '0 24px 64px rgba(0,0,0,0.12)',
                    },
                },
            },
            MuiDialogTitle: {
                styleOverrides: {
                    root: {
                        fontSize: '1.125rem',
                        fontWeight: 700,
                        padding: '20px 24px 16px',
                    },
                },
            },
            MuiDialogContent: {
                styleOverrides: {
                    root: { padding: '0 24px 20px' },
                    dividers: { padding: '20px 24px' },
                },
            },
            MuiDialogActions: {
                styleOverrides: {
                    root: { padding: '12px 24px 20px', gap: 8 },
                },
            },

            // ── Tabs ───────────────────────────────────────────────
            MuiTabs: {
                styleOverrides: {
                    indicator: {
                        height: 3,
                        borderRadius: '3px 3px 0 0',
                        backgroundColor: isDark ? '#3B82F6' : '#2563EB',
                    },
                },
            },
            MuiTab: {
                styleOverrides: {
                    root: {
                        textTransform: 'none',
                        fontWeight: 500,
                        fontSize: '0.875rem',
                        minHeight: 48,
                        color: isDark ? '#94A3B8' : '#475569',
                        transition: 'color 0.15s ease',
                        '&.Mui-selected': {
                            color: isDark ? '#3B82F6' : '#2563EB',
                            fontWeight: 700,
                        },
                    },
                },
            },

            // ── Table ──────────────────────────────────────────────
            MuiTableHead: {
                styleOverrides: {
                    root: {
                        backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    },
                },
            },
            MuiTableCell: {
                styleOverrides: {
                    head: {
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        color: isDark ? '#94A3B8' : '#475569',
                        backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                        padding: '12px 16px',
                    },
                    body: { padding: '14px 16px' },
                },
            },
            MuiTableRow: {
                styleOverrides: {
                    root: {
                        '&.MuiTableRow-hover:hover': {
                            backgroundColor: isDark
                                ? 'rgba(59,130,246,0.06)'
                                : 'rgba(37,99,235,0.04)',
                        },
                    },
                },
            },

            // ── LinearProgress ─────────────────────────────────────
            MuiLinearProgress: {
                styleOverrides: {
                    root: { borderRadius: 6 },
                    colorPrimary: {
                        backgroundColor: isDark ? 'rgba(59,130,246,0.2)' : 'rgba(37,99,235,0.12)',
                    },
                    barColorPrimary: {
                        backgroundColor: isDark ? '#3B82F6' : '#2563EB',
                    },
                },
            },

            // ── ToggleButton ───────────────────────────────────────
            MuiToggleButton: {
                styleOverrides: {
                    root: {
                        borderRadius: 8,
                        '&.Mui-selected': {
                            backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : 'rgba(37,99,235,0.1)',
                            color: isDark ? '#3B82F6' : '#2563EB',
                            '&:hover': {
                                backgroundColor: isDark ? 'rgba(59,130,246,0.2)' : 'rgba(37,99,235,0.15)',
                            },
                        },
                    },
                },
            },

            // ── Drawer ─────────────────────────────────────────────
            MuiDrawer: {
                styleOverrides: {
                    paper: {
                        backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                        borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                    },
                },
            },

            // ── Alert ──────────────────────────────────────────────
            MuiAlert: {
                styleOverrides: {
                    root: {
                        borderRadius: 10,
                        alignItems: 'center',
                        fontWeight: 500,
                    },
                    standardError: {
                        backgroundColor: isDark ? 'rgba(244,63,94,0.12)' : 'rgba(220,38,38,0.08)',
                        color: isDark ? '#FB7185' : '#9F1239',
                    },
                    standardSuccess: {
                        backgroundColor: isDark ? 'rgba(34,197,94,0.12)' : 'rgba(22,163,74,0.08)',
                        color: isDark ? '#4ADE80' : '#14532D',
                    },
                    standardWarning: {
                        backgroundColor: isDark ? 'rgba(245,158,11,0.12)' : 'rgba(217,119,6,0.08)',
                        color: isDark ? '#FBBF24' : '#92400E',
                    },
                    standardInfo: {
                        backgroundColor: isDark ? 'rgba(56,189,248,0.12)' : 'rgba(2,132,199,0.08)',
                        color: isDark ? '#7DD3FC' : '#075985',
                    },
                },
            },

            // ── Skeleton ───────────────────────────────────────────
            MuiSkeleton: {
                defaultProps: { animation: 'wave' },
                styleOverrides: {
                    root: {
                        borderRadius: 8,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
                    },
                },
            },

            // ── Tooltip ────────────────────────────────────────────
            MuiTooltip: {
                defaultProps: { arrow: true },
                styleOverrides: {
                    tooltip: {
                        borderRadius: 6,
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        backgroundColor: isDark ? '#334155' : '#0F172A',
                    },
                    arrow: {
                        color: isDark ? '#334155' : '#0F172A',
                    },
                },
            },

            // ── Menu ───────────────────────────────────────────────
            MuiMenu: {
                styleOverrides: {
                    paper: {
                        borderRadius: 12,
                        boxShadow: isDark
                            ? '0 8px 32px rgba(0,0,0,0.5)'
                            : '0 8px 32px rgba(0,0,0,0.12)',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                    },
                },
            },
            MuiMenuItem: {
                styleOverrides: {
                    root: {
                        borderRadius: 6,
                        margin: '2px 4px',
                        minHeight: 44,
                        padding: '8px 12px',
                        transition: 'background-color 0.12s ease',
                        '&:hover': {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        },
                    },
                },
            },

            // ── Checkbox ───────────────────────────────────────────
            MuiCheckbox: {
                styleOverrides: {
                    root: {
                        color: isDark ? '#64748B' : '#94A3B8',
                        '&.Mui-checked': {
                            color: isDark ? '#3B82F6' : '#2563EB',
                        },
                    },
                },
            },
        },
    });
};
