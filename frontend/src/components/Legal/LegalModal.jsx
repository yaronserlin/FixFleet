// src/components/Legal/LegalModal.jsx
import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Tabs,
    Tab,
    Divider,
    IconButton,
    Paper,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import GavelIcon from '@mui/icons-material/Gavel';
import SecurityIcon from '@mui/icons-material/Security';
import AccessibleIcon from '@mui/icons-material/Accessible';
import { LEGAL_DOCS } from '../../content/legalDocuments';
import LanguageToggle from './LanguageToggle';

export default function LegalModal({ open, onClose, defaultTab = 'terms' }) {
    const [currentTab, setCurrentTab] = useState(defaultTab);
    const [lang, setLang] = useState('en');

    useEffect(() => {
        if (open && defaultTab) {
            setCurrentTab(defaultTab);
        }
    }, [open, defaultTab]);

    const docSet = LEGAL_DOCS[currentTab] || LEGAL_DOCS.terms;
    const activeDoc = docSet[lang] || docSet.en;
    const isRtl = activeDoc.dir === 'rtl';

    const tabIcon = (tab) =>
        tab === 'privacy' ? <SecurityIcon fontSize="small" />
        : tab === 'accessibility' ? <AccessibleIcon fontSize="small" />
        : <GavelIcon fontSize="small" />;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            scroll="paper"
            aria-labelledby="legal-modal-title"
            sx={{
                '& .MuiDialog-paper': {
                    borderRadius: 3,
                    maxHeight: '85vh',
                },
            }}
        >
            <DialogTitle
                id="legal-modal-title"
                component="div"
                sx={{
                    p: 2,
                    pb: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                        sx={{
                            p: 1,
                            borderRadius: 2,
                            bgcolor: 'primary.light',
                            color: 'primary.contrastText',
                            display: 'flex',
                        }}
                    >
                        {tabIcon(currentTab)}
                    </Box>
                    <Box>
                        <Typography variant="h6" fontWeight={700}>
                            {activeDoc.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Version {activeDoc.version} • Last updated {activeDoc.lastUpdated}
                        </Typography>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LanguageToggle lang={lang} onChange={setLang} />
                    <IconButton onClick={onClose} aria-label="Close dialog" size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>

            <Box sx={{ px: 3, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
                <Tabs
                    value={currentTab}
                    onChange={(e, val) => setCurrentTab(val)}
                    aria-label="legal documents tabs"
                    textColor="primary"
                    indicatorColor="primary"
                >
                    <Tab
                        value="terms"
                        label="Terms of Service"
                        icon={<GavelIcon fontSize="small" />}
                        iconPosition="start"
                        sx={{ minHeight: 48, textTransform: 'none', fontWeight: 600 }}
                    />
                    <Tab
                        value="privacy"
                        label="Privacy Policy"
                        icon={<SecurityIcon fontSize="small" />}
                        iconPosition="start"
                        sx={{ minHeight: 48, textTransform: 'none', fontWeight: 600 }}
                    />
                    <Tab
                        value="accessibility"
                        label="Accessibility"
                        icon={<AccessibleIcon fontSize="small" />}
                        iconPosition="start"
                        sx={{ minHeight: 48, textTransform: 'none', fontWeight: 600 }}
                    />
                </Tabs>
            </Box>

            <DialogContent dividers sx={{ p: 3 }}>
                <Paper
                    elevation={0}
                    dir={isRtl ? 'rtl' : 'ltr'}
                    sx={{
                        p: { xs: 1, sm: 2 },
                        bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'background.default' : '#fafafa'),
                        borderRadius: 2,
                    }}
                >
                    {activeDoc.sections.map((section, idx) => (
                        <Box key={idx} sx={{ mb: 3, '&:last-child': { mb: 0 } }}>
                            <Typography
                                variant="subtitle1"
                                fontWeight={700}
                                color="text.primary"
                                gutterBottom
                            >
                                {section.heading}
                            </Typography>
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                    whiteSpace: 'pre-line',
                                    lineHeight: 1.7,
                                    fontSize: '0.9rem',
                                }}
                            >
                                {section.content}
                            </Typography>
                            {idx < activeDoc.sections.length - 1 && (
                                <Divider sx={{ my: 2.5, opacity: 0.6 }} />
                            )}
                        </Box>
                    ))}
                </Paper>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose} variant="contained" color="primary" sx={{ px: 3 }}>
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
}
