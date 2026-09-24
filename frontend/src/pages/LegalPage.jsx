// src/pages/LegalPage.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Container,
    Paper,
    Typography,
    Box,
    Tabs,
    Tab,
    Divider,
    Button,
    Breadcrumbs,
    Link,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import GavelIcon from '@mui/icons-material/Gavel';
import SecurityIcon from '@mui/icons-material/Security';
import AccessibleIcon from '@mui/icons-material/Accessible';
import { LEGAL_DOCS } from '../content/legalDocuments';
import LanguageToggle from '../components/Legal/LanguageToggle';
import { useAuth } from '../contexts/AuthContext';

export default function LegalPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();

    const tabFromPath = (path) =>
        path.includes('/privacy') ? 'privacy'
        : path.includes('/accessibility') ? 'accessibility'
        : 'terms';

    const [currentTab, setCurrentTab] = useState(tabFromPath(location.pathname));
    const [lang, setLang] = useState('en');

    useEffect(() => {
        setCurrentTab(tabFromPath(location.pathname));
    }, [location.pathname]);

    const docSet = LEGAL_DOCS[currentTab] || LEGAL_DOCS.terms;
    const activeDoc = docSet[lang] || docSet.en;
    const isRtl = activeDoc.dir === 'rtl';

    const handleBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate(user ? '/dashboard' : '/login');
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#0b0f19' : '#f8fafc'),
                py: { xs: 3, md: 5 },
            }}
        >
            <Container maxWidth="md">
                <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Button
                        startIcon={<ArrowBackIcon />}
                        onClick={handleBack}
                        variant="outlined"
                        size="small"
                        sx={{ textTransform: 'none', borderRadius: 2 }}
                    >
                        Back
                    </Button>
                    <Breadcrumbs aria-label="breadcrumb" sx={{ fontSize: '0.875rem' }}>
                        <Link
                            underline="hover"
                            color="inherit"
                            onClick={() => navigate(user ? '/dashboard' : '/login')}
                            sx={{ cursor: 'pointer' }}
                        >
                            App
                        </Link>
                        <Typography color="text.primary">Legal</Typography>
                    </Breadcrumbs>
                </Box>

                <Paper
                    elevation={2}
                    sx={{
                        borderRadius: 3,
                        overflow: 'hidden',
                        bgcolor: 'background.paper',
                    }}
                >
                    {/* Header banner */}
                    <Box
                        sx={{
                            p: { xs: 2.5, sm: 4 },
                            background: (theme) =>
                                theme.palette.mode === 'dark'
                                    ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
                                    : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                            color: '#ffffff',
                        }}
                    >
                        <Typography variant="h4" fontWeight={800} letterSpacing="-0.02em" gutterBottom>
                            Legal & Compliance
                        </Typography>
                        <Typography variant="body1" sx={{ opacity: 0.9 }}>
                            Review our terms, operational policies, and data privacy safeguards.
                        </Typography>
                    </Box>

                    {/* Document Selector Tabs */}
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', px: { xs: 2, sm: 4 } }}>
                        <Tabs
                            value={currentTab}
                            onChange={(e, val) => {
                                setCurrentTab(val);
                                navigate(`/${val}`, { replace: true });
                            }}
                            textColor="primary"
                            indicatorColor="primary"
                            aria-label="Legal document tabs"
                        >
                            <Tab
                                value="terms"
                                label="Terms of Service"
                                icon={<GavelIcon fontSize="small" />}
                                iconPosition="start"
                                sx={{ textTransform: 'none', fontWeight: 700, minHeight: 52 }}
                            />
                            <Tab
                                value="privacy"
                                label="Privacy Policy"
                                icon={<SecurityIcon fontSize="small" />}
                                iconPosition="start"
                                sx={{ textTransform: 'none', fontWeight: 700, minHeight: 52 }}
                            />
                            <Tab
                                value="accessibility"
                                label="Accessibility"
                                icon={<AccessibleIcon fontSize="small" />}
                                iconPosition="start"
                                sx={{ textTransform: 'none', fontWeight: 700, minHeight: 52 }}
                            />
                        </Tabs>
                    </Box>

                    {/* Document Body */}
                    <Box sx={{ p: { xs: 2.5, sm: 4 } }} dir={isRtl ? 'rtl' : 'ltr'}>
                        <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                            <Box>
                                <Typography variant="h5" fontWeight={700} gutterBottom>
                                    {activeDoc.title}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Version {activeDoc.version} • Last updated {activeDoc.lastUpdated}
                                </Typography>
                            </Box>
                            <LanguageToggle lang={lang} onChange={setLang} />
                        </Box>

                        {activeDoc.sections.map((section, idx) => (
                            <Box key={idx} sx={{ mb: 3.5 }}>
                                <Typography variant="subtitle1" fontWeight={700} color="text.primary" gutterBottom>
                                    {section.heading}
                                </Typography>
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{
                                        whiteSpace: 'pre-line',
                                        lineHeight: 1.8,
                                        fontSize: '0.925rem',
                                    }}
                                >
                                    {section.content}
                                </Typography>
                                {idx < activeDoc.sections.length - 1 && (
                                    <Divider sx={{ my: 3, opacity: 0.5 }} />
                                )}
                            </Box>
                        ))}
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
}
