import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    List,
    ListItem,
    ListItemText,
    Button,
    Box,
    Typography,
    Chip,
    IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SpeedIcon from '@mui/icons-material/Speed';
import ReplayIcon from '@mui/icons-material/Replay';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { getMediaUrl } from '../../../utils/mediaUtils';
import { formatUserName } from '../../../utils/formatUtils';
import { useAuth } from '../../../contexts/AuthContext';
import ImageViewerDialog from '../../ImageViewer/ImageViewerDialog';
import { isMechanicOrAdmin } from '../../../constants/roles';
import { FAULT_STATUS } from '../../../constants/faultStatus';

export default function FaultDetailsDialog({
    open,
    onClose,
    fault,
    onCloseFault,
    onReopenFault,
}) {
    const { user } = useAuth();
    const [viewerIndex, setViewerIndex] = useState(null);
    const canManage = user && isMechanicOrAdmin(user.role);

    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                maxWidth="sm"
                fullWidth
                sx={{
                    '& .MuiDialog-paper': {
                        m: { xs: 2, sm: 3 },
                        maxHeight: { xs: 'calc(100% - 32px)', sm: 'calc(100% - 64px)' },
                        borderRadius: 3,
                    },
                }}
            >
                <DialogTitle
                    component="div"
                    sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, pr: 1.5 }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
                        <Typography variant="h6" component="div" fontWeight="bold">Fault Details</Typography>
                        {fault?.status && (
                            <Chip
                                icon={fault.status === FAULT_STATUS.OPEN ? <WarningAmberIcon /> : <CheckCircleIcon />}
                                label={fault.status === FAULT_STATUS.OPEN ? 'Open Fault' : 'Resolved'}
                                color={fault.status === FAULT_STATUS.OPEN ? 'error' : 'success'}
                                size="small"
                            />
                        )}
                    </Box>
                    <IconButton onClick={onClose} size="small" aria-label="close">
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    {fault && (
                        <List disablePadding>
                            <ListItem disableGutters>
                                <ListItemText primary="Fault Code" secondary={fault.code || 'N/A'} />
                            </ListItem>
                            <ListItem disableGutters>
                                <ListItemText primary="Description" secondary={fault.description} />
                            </ListItem>

                            {fault.engineHours !== undefined && (
                                <ListItem disableGutters>
                                    <ListItemText
                                        primary="Reported Engine Hours"
                                        secondaryTypographyProps={{ component: 'div' }}
                                        secondary={
                                            <Chip
                                                icon={<SpeedIcon />}
                                                label={`${fault.engineHours} hrs`}
                                                size="small"
                                                variant="outlined"
                                                sx={{ mt: 0.5 }}
                                            />
                                        }
                                    />
                                </ListItem>
                            )}

                            {fault.closingEngineHours !== undefined && (
                                <ListItem disableGutters>
                                    <ListItemText
                                        primary="Closing Engine Hours"
                                        secondaryTypographyProps={{ component: 'div' }}
                                        secondary={
                                            <Chip
                                                icon={<SpeedIcon />}
                                                label={`${fault.closingEngineHours} hrs`}
                                                size="small"
                                                color="success"
                                                variant="outlined"
                                                sx={{ mt: 0.5 }}
                                            />
                                        }
                                    />
                                </ListItem>
                            )}

                            <ListItem disableGutters>
                                <ListItemText
                                    primary="Reported By"
                                    secondary={formatUserName(fault.operator?.name) || fault.operator?.name || fault.operator || 'N/A'}
                                />
                            </ListItem>

                            <ListItem disableGutters>
                                <ListItemText
                                    primary="Reported At"
                                    secondary={new Date(fault.createdAt).toLocaleString('en-GB')}
                                />
                            </ListItem>

                            {fault.status === FAULT_STATUS.CLOSED && (
                                <>
                                    <ListItem disableGutters>
                                        <ListItemText
                                            primary="Closed At"
                                            secondary={
                                                fault.closedAt ? new Date(fault.closedAt).toLocaleString('en-GB') : 'N/A'
                                            }
                                        />
                                    </ListItem>
                                    {fault.resolvedBy && (
                                        <ListItem disableGutters>
                                            <ListItemText
                                                primary="Resolved By"
                                                secondary={formatUserName(fault.resolvedBy?.name) || fault.resolvedBy?.name || fault.resolvedBy?.email || fault.resolvedBy || 'Technician'}
                                            />
                                        </ListItem>
                                    )}
                                    {fault.resolutionDescription && (
                                        <ListItem disableGutters sx={{ flexDirection: 'column', alignItems: 'flex-start', mt: 0.5 }}>
                                            <ListItemText
                                                primary="Resolution Notes & Work Performed"
                                                secondary={fault.resolutionDescription}
                                                secondaryTypographyProps={{
                                                    sx: {
                                                        whiteSpace: 'pre-wrap',
                                                        color: 'text.primary',
                                                        mt: 0.75,
                                                        p: 1.5,
                                                        borderRadius: 2,
                                                        bgcolor: 'action.hover',
                                                        border: '1px solid',
                                                        borderColor: 'divider',
                                                        width: '100%',
                                                    },
                                                }}
                                            />
                                        </ListItem>
                                    )}
                                </>
                            )}

                            {fault.photos?.length > 0 && (
                                <ListItem disableGutters sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                                        Photos ({fault.photos.length}):
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                                        {fault.photos.map((photo, idx) => (
                                            <Box
                                                key={idx}
                                                component="button"
                                                type="button"
                                                onClick={() => setViewerIndex(idx)}
                                                aria-label={`View photo ${idx + 1}`}
                                                sx={{
                                                    all: 'unset',
                                                    cursor: 'pointer',
                                                    borderRadius: '6px',
                                                    overflow: 'hidden',
                                                    border: '1px solid #ccc',
                                                    display: 'block',
                                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                                    '&:hover': {
                                                        transform: 'scale(1.04)',
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                                    },
                                                    '&:focus-visible': {
                                                        outline: '2px solid #1976d2',
                                                        outlineOffset: '2px',
                                                    },
                                                }}
                                            >
                                                <Box
                                                    component="img"
                                                    src={getMediaUrl(photo)}
                                                    alt={`Photo ${idx + 1}`}
                                                    sx={{ width: 90, height: 90, objectFit: 'cover', display: 'block' }}
                                                />
                                            </Box>
                                        ))}
                                    </Box>
                                </ListItem>
                            )}
                        </List>
                    )}
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'flex-end', px: 3, py: 1.5 }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        {canManage && fault?.status === FAULT_STATUS.CLOSED && onReopenFault && (
                            <Button
                                variant="contained"
                                color="warning"
                                startIcon={<ReplayIcon />}
                                onClick={() => {
                                    onClose();
                                    onReopenFault(fault);
                                }}
                                sx={{ fontWeight: 700 }}
                            >
                                Reopen Fault
                            </Button>
                        )}
                        {canManage && fault?.status === FAULT_STATUS.OPEN && onCloseFault && (
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={() => {
                                    onClose();
                                    onCloseFault(fault);
                                }}
                                sx={{ fontWeight: 700 }}
                            >
                                Resolve Fault
                            </Button>
                        )}
                        <Button
                            onClick={onClose}
                            variant="outlined"
                            color="inherit"
                            startIcon={<CloseIcon />}
                            sx={{
                                color: 'text.secondary',
                                borderColor: 'divider',
                                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                                fontWeight: 600,
                                '&:hover': {
                                    borderColor: 'text.primary',
                                    color: 'text.primary',
                                },
                            }}
                        >
                            Dismiss
                        </Button>
                    </Box>
                </DialogActions>
            </Dialog>

            {/* In-App Image Viewer Dialog */}
            <ImageViewerDialog
                open={viewerIndex !== null}
                onClose={() => setViewerIndex(null)}
                images={fault?.photos || []}
                initialIndex={viewerIndex ?? 0}
                title={`Fault ${fault?.code || ''} Photo`}
            />
        </>
    );
}