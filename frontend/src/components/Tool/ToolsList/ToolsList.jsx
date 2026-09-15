// src/components/Tool/ToolsList/ToolsList.jsx
import React from 'react';
import {
    Typography,
    Box,
    Grid,
    Card,
    CardActionArea,
    CardContent,
    CardActions,
    Button,
    Chip,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    TableContainer,
    Paper,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import SpeedIcon from '@mui/icons-material/Speed';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import BookIcon from '@mui/icons-material/Book';
import BuildIcon from '@mui/icons-material/Build';
import { useNavigate } from 'react-router-dom';
import { equipmentDetailRoute } from '../../../constants/routes';

/**
 * Displays a list of equipment in either responsive Card Grid or Table layout.
 */
export default function ToolsList({ tools = [], viewMode = 'grid', openFaultsByTool = {} }) {
    const navigate = useNavigate();

    if (tools.length === 0) {
        return (
            <Paper
                variant="outlined"
                sx={{
                    p: { xs: 4, sm: 6 },
                    textAlign: 'center',
                    bgcolor: 'background.paper',
                    borderRadius: 3,
                }}
            >
                <PrecisionManufacturingIcon sx={{ fontSize: 56, color: 'text.secondary', mb: 1.5, opacity: 0.7 }} />
                <Typography variant="h6" fontWeight={700} gutterBottom>
                    No equipment found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Try adjusting your search query or filters.
                </Typography>
            </Paper>
        );
    }

    if (viewMode === 'table') {
        return (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
                <Table size="small">
                    <TableHead sx={{ bgcolor: 'background.subtle' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ID / Unit</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Name</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Model</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Serial Number</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Engine Hours</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {tools.map((tool) => {
                            const openFaultCount = openFaultsByTool[tool._id] || 0;
                            const hasOpenFaults = openFaultCount > 0;

                            return (
                                <TableRow
                                    key={tool._id}
                                    hover
                                    sx={{
                                        cursor: 'pointer',
                                        '&:hover': { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04) },
                                    }}
                                    onClick={() => navigate(equipmentDetailRoute(tool._id))}
                                >
                                    <TableCell>
                                        <Typography variant="subtitle2" fontWeight={700}>
                                            {tool.localSerialNumber || '—'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={600}>
                                            {tool.name}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>{tool.model || '—'}</TableCell>
                                    <TableCell>{tool.serialNumber || '—'}</TableCell>
                                    <TableCell>
                                        {tool.currentEngineHours !== undefined ? (
                                            <Chip
                                                icon={<SpeedIcon sx={{ fontSize: '0.9rem !important' }} />}
                                                label={`${tool.currentEngineHours} hrs`}
                                                size="small"
                                                variant="outlined"
                                                color="primary"
                                                sx={{ height: 22, fontSize: '0.72rem', fontWeight: 600 }}
                                            />
                                        ) : '—'}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            icon={hasOpenFaults ? <WarningAmberIcon /> : <CheckCircleIcon />}
                                            label={hasOpenFaults ? `${openFaultCount} Fault${openFaultCount > 1 ? 's' : ''}` : 'Ready'}
                                            size="small"
                                            color={hasOpenFaults ? 'error' : 'success'}
                                            sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Button
                                            size="small"
                                            variant="text"
                                            color="primary"
                                            endIcon={<ChevronRightIcon />}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(equipmentDetailRoute(tool._id));
                                            }}
                                            sx={{ fontWeight: 700 }}
                                        >
                                            Details
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        );
    }

    // Default: Card Grid View
    return (
        <Grid container spacing={2.5}>
            {tools.map((tool) => {
                const openFaultCount = openFaultsByTool[tool._id] || 0;
                const hasOpenFaults = openFaultCount > 0;
                const schedulesCount = tool.maintenanceSchedule?.length || 0;
                const booksCount = tool.books?.length || 0;

                return (
                    <Grid size={{ xs: 12, sm: 12, md: 6, lg: 4 }} key={tool._id}>
                        <Card
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                height: '100%',
                                borderLeft: hasOpenFaults ? '4px solid #DC2626' : '4px solid #16A34A',
                                borderRadius: '12px',
                                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: (theme) => theme.palette.mode === 'dark'
                                        ? `0 8px 24px rgba(0,0,0,0.5), 0 0 0 1px ${hasOpenFaults ? '#DC262630' : '#16A34A30'}`
                                        : `0 8px 24px ${hasOpenFaults ? 'rgba(220,38,38,0.12)' : 'rgba(22,163,74,0.10)'}`,
                                },
                            }}
                        >
                            <CardActionArea
                                onClick={() => navigate(equipmentDetailRoute(tool._id))}
                                sx={{ flexGrow: 1, p: 0.5 }}
                            >
                                <CardContent sx={{ pb: 1 }}>
                                    {/* Header with Unit Badge & Status */}
                                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1} mb={1.5}>
                                        <Box display="flex" alignItems="center" gap={1.25} sx={{ minWidth: 0, flex: '1 1 auto' }}>
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    width: 42,
                                                    height: 42,
                                                    borderRadius: 2,
                                                    bgcolor: hasOpenFaults
                                                        ? alpha('#DC2626', 0.12)
                                                        : alpha('#16A34A', 0.12),
                                                    color: hasOpenFaults ? '#DC2626' : '#16A34A',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <PrecisionManufacturingIcon fontSize="medium" />
                                            </Box>
                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography variant="h6" fontWeight={700} lineHeight={1.2} sx={{ wordBreak: 'break-word' }}>
                                                    {tool.name}
                                                </Typography>
                                                {tool.localSerialNumber && (
                                                    <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                                        UNIT: {tool.localSerialNumber}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Box>

                                        <Chip
                                            icon={hasOpenFaults ? <WarningAmberIcon sx={{ fontSize: '0.9rem !important' }} /> : <CheckCircleIcon sx={{ fontSize: '0.9rem !important' }} />}
                                            label={hasOpenFaults ? `${openFaultCount} Fault${openFaultCount > 1 ? 's' : ''}` : 'Ready'}
                                            size="small"
                                            color={hasOpenFaults ? 'error' : 'success'}
                                            sx={{ fontWeight: 700, fontSize: '0.72rem', flexShrink: 0 }}
                                        />
                                    </Box>

                                    {/* Specs & Info */}
                                    <Box display="flex" flexWrap="wrap" gap={0.75} mb={1.5}>
                                        {tool.model && (
                                            <Chip
                                                label={`Model: ${tool.model}`}
                                                size="small"
                                                variant="outlined"
                                                sx={{ fontSize: '0.72rem', height: 22 }}
                                            />
                                        )}
                                        {tool.serialNumber && (
                                            <Chip
                                                label={`S/N: ${tool.serialNumber}`}
                                                size="small"
                                                variant="outlined"
                                                sx={{ fontSize: '0.72rem', height: 22 }}
                                            />
                                        )}
                                        {tool.currentEngineHours !== undefined && (
                                            <Chip
                                                icon={<SpeedIcon sx={{ fontSize: '0.9rem !important' }} />}
                                                label={`${tool.currentEngineHours} hrs`}
                                                size="small"
                                                variant="outlined"
                                                color="primary"
                                                sx={{ fontSize: '0.72rem', height: 22, fontWeight: 600 }}
                                            />
                                        )}
                                    </Box>

                                    {tool.description && (
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                                minHeight: 38,
                                                lineHeight: 1.45,
                                            }}
                                        >
                                            {tool.description}
                                        </Typography>
                                    )}
                                </CardContent>
                            </CardActionArea>

                            {/* Card Footer with Quick Indicators & Action */}
                            <CardActions
                                sx={{
                                    justifyContent: 'space-between',
                                    px: 2,
                                    py: 1.25,
                                    borderTop: '1px solid',
                                    borderColor: 'divider',
                                    bgcolor: 'background.subtle',
                                }}
                            >
                                <Box display="flex" gap={1.5} alignItems="center">
                                    <Box display="flex" alignItems="center" gap={0.5} title={`${schedulesCount} Maintenance Schedules`}>
                                        <BuildIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                        <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                            {schedulesCount}
                                        </Typography>
                                    </Box>
                                    <Box display="flex" alignItems="center" gap={0.5} title={`${booksCount} Manuals`}>
                                        <BookIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                        <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                            {booksCount}
                                        </Typography>
                                    </Box>
                                </Box>

                                <Button
                                    size="small"
                                    variant="text"
                                    color="primary"
                                    endIcon={<ChevronRightIcon />}
                                    onClick={() => navigate(equipmentDetailRoute(tool._id))}
                                    sx={{ fontWeight: 700 }}
                                >
                                    Manage
                                </Button>
                            </CardActions>
                        </Card>
                    </Grid>
                );
            })}
        </Grid>
    );
}