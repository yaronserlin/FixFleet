// src/components/Fault/FaultList/FaultList.jsx
import React from 'react';
import {
    Typography,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    TableContainer,
    Button,
    Box,
    Paper,
    Chip,
    Card,
    CardContent,
    CardActionArea,
    CardActions,
    Stack,
} from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import SpeedIcon from '@mui/icons-material/Speed';
import { useAuth } from '../../../contexts/AuthContext';
import { getMediaUrl } from '../../../utils/mediaUtils';
import ImageViewerDialog from '../../ImageViewer/ImageViewerDialog';
import { isMechanicOrAdmin } from '../../../constants/roles';
import { FAULT_STATUS } from '../../../constants/faultStatus';

export default function FaultList({
    faults,
    onFaultClick,
    onCloseFault,
    onReopenFault,
    onDeleteFault,
}) {
    const { user } = useAuth();
    const [activePhotoFault, setActivePhotoFault] = React.useState(null);

    const isUserAuthorized = () => {
        if (!user) return false;
        return isMechanicOrAdmin(user.role);
    };

    if (!faults || faults.length === 0) {
        return <Typography color="text.secondary">No faults recorded for this equipment.</Typography>;
    }

    return (
        <Box sx={{ width: '100%' }}>
            {/* Mobile / Narrow Screen Card View (xs only) */}
            <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
                <Stack spacing={2}>
                    {faults.map((fault) => {
                        const hours = fault.status === FAULT_STATUS.CLOSED && fault.closingEngineHours !== undefined
                            ? fault.closingEngineHours
                            : fault.engineHours;

                        return (
                            <Card key={fault._id} variant="outlined" sx={{ borderRadius: 2 }}>
                                <CardActionArea onClick={() => onFaultClick?.(fault)}>
                                    <CardContent sx={{ pb: 1 }}>
                                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                            <Typography variant="subtitle1" fontWeight="bold">
                                                {fault.code || 'Fault'}
                                            </Typography>
                                            <Chip
                                                size="small"
                                                label={fault.status === FAULT_STATUS.CLOSED ? 'Closed' : 'Open'}
                                                color={fault.status === FAULT_STATUS.CLOSED ? 'success' : 'error'}
                                            />
                                        </Box>
                                        <Box display="flex" gap={1.5} alignItems="center" mb={1}>
                                             {fault.photos && fault.photos.length > 0 ? (
                                                 <Box
                                                     component="img"
                                                     src={getMediaUrl(fault.photos[0])}
                                                     alt="thumbnail"
                                                     sx={{
                                                         width: 44,
                                                         height: 44,
                                                         borderRadius: 1,
                                                         objectFit: 'cover',
                                                         cursor: 'pointer',
                                                         transition: 'transform 0.15s',
                                                         '&:hover': { transform: 'scale(1.1)' },
                                                     }}
                                                     onClick={(e) => {
                                                         e.stopPropagation();
                                                         setActivePhotoFault(fault);
                                                     }}
                                                     title="Click to view photo"
                                                 />
                                             ) : (
                                                <PhotoCameraIcon sx={{ color: 'text.disabled', fontSize: 28 }} />
                                            )}
                                            <Box>
                                                <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 220 }}>
                                                    {fault.description || 'No description provided'}
                                                </Typography>
                                                {hours !== undefined && (
                                                    <Chip
                                                        icon={<SpeedIcon />}
                                                        label={`${hours} hrs`}
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ mt: 0.5, height: 20, fontSize: '0.75rem' }}
                                                    />
                                                )}
                                            </Box>
                                        </Box>
                                        <Typography variant="caption" color="text.secondary" display="block">
                                            Reported: {fault.createdAt ? new Date(fault.createdAt).toLocaleDateString('en-GB') : 'N/A'}
                                        </Typography>
                                    </CardContent>
                                </CardActionArea>
                                {isUserAuthorized() && (
                                    <CardActions sx={{ justifyContent: 'space-between', px: 2, pt: 0, pb: 1.5 }}>
                                        <div>
                                            {fault.status === FAULT_STATUS.CLOSED ? (
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    color="secondary"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onReopenFault?.(fault);
                                                    }}
                                                >
                                                    Reopen
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="small"
                                                    variant="contained"
                                                    color="primary"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onCloseFault?.(fault);
                                                    }}
                                                >
                                                    Resolve
                                                </Button>
                                            )}
                                        </div>
                                        {onDeleteFault && (
                                            <Button
                                                size="small"
                                                color="error"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeleteFault?.(fault);
                                                }}
                                            >
                                                Delete
                                            </Button>
                                        )}
                                    </CardActions>
                                )}
                            </Card>
                        );
                    })}
                </Stack>
            </Box>

            {/* Tablet & Desktop Table View (sm and up) */}
            <TableContainer
                component={Paper}
                variant="outlined"
                sx={{
                    display: { xs: 'none', sm: 'block' },
                    width: '100%',
                    overflowX: 'auto',
                    WebkitOverflowScrolling: 'touch',
                }}
            >
                <Table size="small" sx={{ minWidth: 650 }}>
                    <TableHead>
                        <TableRow>
                            <TableCell>Status</TableCell>
                            <TableCell>Code</TableCell>
                            <TableCell>Photo</TableCell>
                            <TableCell>Hours</TableCell>
                            <TableCell>Description</TableCell>
                            <TableCell>Reported</TableCell>
                            {isUserAuthorized() && <TableCell align="right">Actions</TableCell>}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {faults.map((fault) => (
                            <TableRow
                                key={fault._id}
                                tabIndex={0}
                                role="button"
                                aria-label={`View fault ${fault.code || ''}`}
                                onClick={() => onFaultClick?.(fault)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        onFaultClick?.(fault);
                                    }
                                }}
                                sx={{
                                    cursor: 'pointer',
                                    '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
                                    '&:focus-visible': { outline: '2px solid primary.main' },
                                }}
                            >
                                <TableCell>
                                    <Chip
                                        size="small"
                                        label={fault.status === FAULT_STATUS.CLOSED ? 'Closed' : 'Open'}
                                        color={fault.status === FAULT_STATUS.CLOSED ? 'success' : 'error'}
                                    />
                                </TableCell>
                                <TableCell>{fault.code || 'N/A'}</TableCell>
                                <TableCell>
                                    {fault.photos && fault.photos.length > 0 ? (
                                        <Box
                                            component="img"
                                            src={getMediaUrl(fault.photos[0])}
                                            alt="thumbnail"
                                            sx={{
                                                width: 36,
                                                height: 36,
                                                borderRadius: 1,
                                                objectFit: 'cover',
                                                cursor: 'pointer',
                                                transition: 'transform 0.15s',
                                                '&:hover': { transform: 'scale(1.2)' },
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActivePhotoFault(fault);
                                            }}
                                            title="Click to view photo"
                                        />
                                    ) : (
                                        <PhotoCameraIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                                    )}
                                </TableCell>
                                <TableCell>
                                    {fault.closingEngineHours !== undefined
                                        ? `${fault.closingEngineHours} hrs`
                                        : (fault.engineHours !== undefined ? `${fault.engineHours} hrs` : '-')}
                                </TableCell>
                                <TableCell sx={{ maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {fault.description || 'No description provided'}
                                </TableCell>
                                <TableCell>
                                    {fault.createdAt ? new Date(fault.createdAt).toLocaleDateString('en-GB') : 'N/A'}
                                </TableCell>
                                {isUserAuthorized() && (
                                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                                        <Box display="flex" justifyContent="flex-end" gap={1}>
                                            {fault.status === FAULT_STATUS.CLOSED ? (
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    color="secondary"
                                                    onClick={() => onReopenFault?.(fault)}
                                                >
                                                    Reopen
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="small"
                                                    variant="contained"
                                                    color="primary"
                                                    onClick={() => onCloseFault?.(fault)}
                                                >
                                                    Resolve
                                                </Button>
                                            )}
                                            {onDeleteFault && (
                                                <Button
                                                    size="small"
                                                    color="error"
                                                    onClick={() => onDeleteFault?.(fault)}
                                                >
                                                    Delete
                                                </Button>
                                            )}
                                        </Box>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* In-App Image Viewer Dialog */}
            <ImageViewerDialog
                open={Boolean(activePhotoFault)}
                onClose={() => setActivePhotoFault(null)}
                images={activePhotoFault?.photos || []}
                title={`Fault ${activePhotoFault?.code || ''} Photo`}
            />
        </Box>
    );
}