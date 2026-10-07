// src/components/Dashboard/KpiCard.jsx
import React from 'react';
import { Card, CardContent, Box, Typography } from '@mui/material';

/** A single headline stat card, shared by the company and platform dashboards. */
export default function KpiCard({ label, value, caption, accentColor, icon, iconBg }) {
    return (
        <Card
            sx={{
                borderTop: `4px solid ${accentColor}`,
                borderRadius: '12px',
                '&:hover': { transform: 'translateY(-3px)' },
            }}
        >
            <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Typography
                        variant="overline"
                        sx={{ fontWeight: 700, fontSize: '0.65rem', letterSpacing: '0.08em', color: 'text.secondary' }}
                    >
                        {label}
                    </Typography>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 36,
                            height: 36,
                            borderRadius: 2,
                            bgcolor: iconBg,
                            color: accentColor,
                            flexShrink: 0,
                        }}
                    >
                        {icon}
                    </Box>
                </Box>
                <Typography
                    variant="h3"
                    fontWeight={800}
                    letterSpacing="-0.025em"
                    sx={{ color: accentColor === '#2563EB' ? 'text.primary' : accentColor, mb: 0.5 }}
                >
                    {value}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                    {caption}
                </Typography>
            </CardContent>
        </Card>
    );
}
