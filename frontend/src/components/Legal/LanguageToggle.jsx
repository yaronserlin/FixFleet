// src/components/Legal/LanguageToggle.jsx
import React from 'react';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';

export default function LanguageToggle({ lang, onChange, size = 'small' }) {
    return (
        <ToggleButtonGroup
            value={lang}
            exclusive
            onChange={(e, val) => val && onChange(val)}
            size={size}
            aria-label="Document language"
        >
            <ToggleButton value="en" aria-label="English" sx={{ textTransform: 'none', px: 1.5 }}>
                EN
            </ToggleButton>
            <ToggleButton value="he" aria-label="Hebrew" sx={{ textTransform: 'none', px: 1.5 }}>
                עברית
            </ToggleButton>
        </ToggleButtonGroup>
    );
}
