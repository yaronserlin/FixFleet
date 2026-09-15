// src/components/Fault/FaultCard/FaultCard.jsx
import React from 'react';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import CardMedia from '@mui/material/CardMedia';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import SpeedIcon from '@mui/icons-material/Speed';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BuildIcon from '@mui/icons-material/Build';
import { useAuth } from '../../../contexts/AuthContext';
import { getMediaUrl } from '../../../utils/mediaUtils';
import ImageViewerDialog from '../../ImageViewer/ImageViewerDialog';
import { isMechanicOrAdmin } from '../../../constants/roles';
import { FAULT_STATUS } from '../../../constants/faultStatus';

export default function FaultCard({ fault, onClick, onCloseFault, onReopenFault, onDeleteFault }) {
    const { user } = useAuth();
    const [viewerOpen, setViewerOpen] = React.useState(false);

    const isOpen   = fault.status !== FAULT_STATUS.CLOSED;
    const hasPhoto = fault.photos && fault.photos.length > 0;
    const hours    = fault.status === FAULT_STATUS.CLOSED && fault.closingEngineHours !== undefined
        ? fault.closingEngineHours
        : fault.engineHours;
    const equipmentName = fault.tool?.name || '';

    const isMechOrAdmin = user && isMechanicOrAdmin(user.role);

    // Status color tokens
    const statusColor  = isOpen ? 'error' : 'success';
    const borderColor  = isOpen ? '#DC2626' : '#16A34A';
    const hoverShadow  = isOpen
        ? 'rgba(220,38,38,0.12)'
        : 'rgba(22,163,74,0.10)';

    return (
        <Card
            sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                position: 'relative',
                borderLeft: `4px solid ${borderColor}`,
                borderRadius: '12px',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: (theme) => theme.palette.mode === 'dark'
                        ? `0 8px 24px rgba(0,0,0,0.5), 0 0 0 1px ${borderColor}30`
                        : `0 8px 24px ${hoverShadow}, 0 0 0 1px ${borderColor}20`,
                },
            }}
        >
            {/* Photo (if any) */}
            {hasPhoto && (
                <CardMedia
                    component="img"
                    height="140"
                    image={getMediaUrl(fault.photos[0])}
                    alt={`Photo for ${fault.code || 'fault'}`}
                    sx={{
                        objectFit: 'cover',
                        cursor: 'pointer',
                        transition: 'opacity 0.2s',
                        '&:hover': { opacity: 0.88 },
                    }}
                    onClick={(e) => { e.stopPropagation(); setViewerOpen(true); }}
                    title="Click to view full photo"
                />
            )}

            {/* Clickable content */}
            <CardActionArea onClick={() => onClick?.(fault)} sx={{ flexGrow: 1 }}>
                <CardContent sx={{ pb: 1 }}>
                    {/* Header: code + status */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                        <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                            {fault.code || 'Fault'}
                        </Typography>
                        <Chip
                            icon={isOpen
                                ? <WarningAmberIcon sx={{ fontSize: '0.95rem !important' }} />
                                : <CheckCircleIcon sx={{ fontSize: '0.95rem !important' }} />
                            }
                            label={isOpen ? 'Open' : 'Closed'}
                            size="small"
                            color={statusColor}
                            sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                        />
                    </Box>

                    {/* Equipment name */}
                    {equipmentName && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                            <BuildIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                fontWeight={600}
                                sx={{ lineHeight: 1 }}
                            >
                                {equipmentName}
                            </Typography>
                        </Box>
                    )}

                    {/* Description */}
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                            mb: 1.5,
                            minHeight: 36,
                            lineHeight: 1.5,
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                        }}
                    >
                        {fault.description}
                    </Typography>

                    {/* Engine hours + date */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
                        {hours !== undefined && (
                            <Chip
                                icon={<SpeedIcon sx={{ fontSize: '0.9rem !important', color: 'primary.main' }} />}
                                label={`${hours} hrs`}
                                size="small"
                                variant="outlined"
                                color="primary"
                                sx={{ height: 22, fontSize: '0.72rem', fontWeight: 600 }}
                            />
                        )}
                        <Typography variant="caption" color="text.secondary">
                            {new Date(fault.createdAt).toLocaleDateString('en-GB', {
                                day: '2-digit', month: 'short', year: 'numeric',
                            })}
                        </Typography>
                    </Box>
                </CardContent>
            </CardActionArea>

            {/* Action buttons (admin / mechanic only) */}
            {isMechOrAdmin && (
                <CardActions
                    sx={{
                        justifyContent: 'space-between',
                        px: 2,
                        pb: 1.5,
                        pt: 0.5,
                        borderTop: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.subtle',
                    }}
                >
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        {isOpen ? (
                            <Button
                                size="small"
                                variant="contained"
                                color="primary"
                                onClick={(e) => { e.stopPropagation(); onCloseFault?.(fault); }}
                                sx={{ minHeight: 34, fontWeight: 700 }}
                            >
                                Resolve Fault
                            </Button>
                        ) : (
                            <Button
                                size="small"
                                variant="outlined"
                                color="secondary"
                                onClick={(e) => { e.stopPropagation(); onReopenFault?.(fault); }}
                                sx={{ minHeight: 34 }}
                            >
                                Reopen
                            </Button>
                        )}
                    </Box>

                    {isMechOrAdmin && onDeleteFault && (
                        <Button
                            size="small"
                            variant="text"
                            color="error"
                            onClick={(e) => { e.stopPropagation(); onDeleteFault?.(fault); }}
                            sx={{ minHeight: 34, fontWeight: 600 }}
                        >
                            Delete
                        </Button>
                    )}
                </CardActions>
            )}

            <ImageViewerDialog
                open={viewerOpen}
                onClose={() => setViewerOpen(false)}
                images={fault.photos || []}
                title={`Fault ${fault.code || ''} — Photo`}
            />
        </Card>
    );
}
