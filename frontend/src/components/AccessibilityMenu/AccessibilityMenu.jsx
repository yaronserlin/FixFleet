// src/components/AccessibilityMenu/AccessibilityMenu.jsx
//
// Floating accessibility menu: text size, high contrast and link underlining.
// Preferences persist in localStorage and apply to the whole document. The
// app itself aims to conform to WCAG 2.0 AA (IS 5568); this menu is an added
// convenience, not a substitute for an accessible app.
//
// Placement: the button sits bottom-right and lifts itself above anything
// pinned to the bottom of the screen (the phone bottom nav bar, the legal
// footer when scrolled into view) so it never covers a control.

import React, { useEffect, useState } from 'react';
import {
    Box, Button, ButtonGroup, Fab, FormControlLabel, Paper, Switch, Typography,
} from '@mui/material';
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew';
import CloseIcon from '@mui/icons-material/Close';

import {
    DEFAULTS, EDGE_GAP, FONT_STEPS, STORAGE_KEY, applyPrefs, loadPrefs, measureBottomOffset,
} from './accessibilityPrefs';

export default function AccessibilityMenu() {
    const [open, setOpen] = useState(false);
    const [prefs, setPrefs] = useState(loadPrefs);
    const [bottomOffset, setBottomOffset] = useState(EDGE_GAP);

    useEffect(() => {
        applyPrefs(prefs);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
        } catch {
            // storage unavailable - preferences apply for this session only
        }
    }, [prefs]);

    useEffect(() => {
        let frame = 0;
        const schedule = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => setBottomOffset(measureBottomOffset()));
        };
        schedule();
        window.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', schedule);
        const observer = typeof MutationObserver !== 'undefined' ? new MutationObserver(schedule) : null;
        observer?.observe(document.body, { childList: true, subtree: true });
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('scroll', schedule);
            window.removeEventListener('resize', schedule);
            observer?.disconnect();
        };
    }, []);

    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open]);

    const update = (patch) => setPrefs((prev) => ({ ...prev, ...patch }));

    return (
        <Box
            sx={{
                position: 'fixed',
                right: { xs: 16, sm: 24 },
                bottom: `${bottomOffset}px`,
                zIndex: (theme) => theme.zIndex.speedDial,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: 1,
                transition: 'bottom 0.15s ease-out',
            }}
        >
            {open && (
                <Paper
                    role="dialog"
                    aria-label="Accessibility options"
                    elevation={8}
                    sx={{
                        p: 2,
                        width: 260,
                        maxHeight: `calc(100vh - ${bottomOffset + 80}px)`,
                        overflowY: 'auto',
                        borderRadius: 3,
                    }}
                >
                    <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                        Accessibility
                    </Typography>

                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        Text size ({FONT_STEPS[prefs.fontStep]}%)
                    </Typography>
                    <ButtonGroup fullWidth size="small" variant="outlined" aria-label="Text size" sx={{ mb: 1.5 }}>
                        <Button
                            onClick={() => update({ fontStep: Math.max(0, prefs.fontStep - 1) })}
                            disabled={prefs.fontStep === 0}
                            aria-label="Decrease text size"
                        >
                            A-
                        </Button>
                        <Button
                            onClick={() => update({ fontStep: Math.min(FONT_STEPS.length - 1, prefs.fontStep + 1) })}
                            disabled={prefs.fontStep === FONT_STEPS.length - 1}
                            aria-label="Increase text size"
                        >
                            A+
                        </Button>
                    </ButtonGroup>

                    <FormControlLabel
                        sx={{ display: 'flex', ml: 0, mb: 0.5 }}
                        control={(
                            <Switch
                                size="small"
                                checked={prefs.highContrast}
                                onChange={(e) => update({ highContrast: e.target.checked })}
                            />
                        )}
                        label={<Typography variant="body2" sx={{ ml: 1 }}>High contrast</Typography>}
                    />
                    <FormControlLabel
                        sx={{ display: 'flex', ml: 0, mb: 1.5 }}
                        control={(
                            <Switch
                                size="small"
                                checked={prefs.underlineLinks}
                                onChange={(e) => update({ underlineLinks: e.target.checked })}
                            />
                        )}
                        label={<Typography variant="body2" sx={{ ml: 1 }}>Underline links</Typography>}
                    />

                    <Button fullWidth size="small" variant="outlined" color="secondary" onClick={() => setPrefs({ ...DEFAULTS })}>
                        Reset
                    </Button>
                </Paper>
            )}

            <Fab
                color="primary"
                size="medium"
                onClick={() => setOpen((prev) => !prev)}
                aria-label={open ? 'Close accessibility menu' : 'Open accessibility menu'}
                aria-expanded={open}
            >
                {open ? <CloseIcon /> : <AccessibilityNewIcon />}
            </Fab>
        </Box>
    );
}
