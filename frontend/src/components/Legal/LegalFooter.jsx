import React, { useState } from 'react';
import { Box, Link, Typography } from '@mui/material';
import { APP_VERSION } from '../../constants/appVersion';
import LegalModal from './LegalModal';

export default function LegalFooter() {
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState('terms');

    const showLegal = (nextTab) => {
        setTab(nextTab);
        setOpen(true);
    };

    return (
        <Box
            component="footer"
            sx={{
                mt: 'auto',
                pt: { xs: 3, md: 4 },
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
                color: 'text.secondary',
                textAlign: { xs: 'center', sm: 'left' },
            }}
        >
            <Typography variant="caption">
                Maintenance System · Version {APP_VERSION}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <Link component="button" type="button" variant="caption" color="inherit" onClick={() => showLegal('terms')}>
                    Terms of Service
                </Link>
                <Typography variant="caption" color="text.disabled">•</Typography>
                <Link component="button" type="button" variant="caption" color="inherit" onClick={() => showLegal('privacy')}>
                    Privacy Policy
                </Link>
            </Box>
            <Typography variant="caption" sx={{ display: { xs: 'block', sm: 'none' } }}>
                Fleet maintenance operations platform
            </Typography>
            <LegalModal open={open} onClose={() => setOpen(false)} defaultTab={tab} />
        </Box>
    );
}