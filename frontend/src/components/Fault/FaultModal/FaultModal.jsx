import * as React from 'react';
import Backdrop from '@mui/material/Backdrop';
import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';
import Fade from '@mui/material/Fade';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { Chip, Stack } from '@mui/material';
import SpeedIcon from '@mui/icons-material/Speed';
import ReplayIcon from '@mui/icons-material/Replay';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import { getMediaUrl } from '../../../utils/mediaUtils';
import { formatUserName } from '../../../utils/formatUtils';
import { useAuth } from '../../../contexts/AuthContext';
import ImageViewerDialog from '../../ImageViewer/ImageViewerDialog';
import { isMechanicOrAdmin } from '../../../constants/roles';
import { FAULT_STATUS } from '../../../constants/faultStatus';

const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '90%',
    maxWidth: '650px',
    maxHeight: '90vh',
    overflowY: 'auto',
    bgcolor: 'background.paper',
    borderRadius: '12px',
    boxShadow: 24,
    p: 3.5,
};

export default function FaultModal({
    fault,
    handleClose,
    open,
    onCloseFault,
    onReopenFault,
    onDeleteFault,
}) {
    const { user } = useAuth();
    const [viewerIndex, setViewerIndex] = React.useState(null);

    if (!fault) return null;

    const canManage = user && isMechanicOrAdmin(user.role);
    const photos = fault.photos || [];

    return (
        <>
            <Modal
                aria-labelledby="modal-title"
                aria-describedby="modal-description"
                open={open}
                onClose={handleClose}
                closeAfterTransition
                slots={{ backdrop: Backdrop }}
                slotProps={{
                    backdrop: {
                        timeout: 500,
                    },
                }}
            >
                <Fade in={open}>
                    <Box sx={style}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                            <Typography id="modal-title" variant="h6" component="h2" fontWeight="bold">
                                {fault.tool?.name ?? 'Equipment'} — {fault.code || 'No Code'}
                            </Typography>
                            {fault.status && (
                                <Chip
                                    label={fault.status.toUpperCase()}
                                    color={fault.status === FAULT_STATUS.OPEN ? 'error' : 'success'}
                                    size="small"
                                />
                            )}
                        </Box>

                        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
                            {fault.engineHours !== undefined && (
                                <Chip
                                    icon={<SpeedIcon />}
                                    label={`Reported Hours: ${fault.engineHours} hrs`}
                                    size="small"
                                    variant="outlined"
                                />
                            )}
                            {fault.closingEngineHours !== undefined && (
                                <Chip
                                    icon={<SpeedIcon />}
                                    label={`Closing Hours: ${fault.closingEngineHours} hrs`}
                                    size="small"
                                    color="success"
                                    variant="outlined"
                                />
                            )}
                        </Stack>

                        <Typography variant="subtitle2" color="text.secondary">
                            Description:
                        </Typography>
                        <Typography id="modal-description" sx={{ mt: 0.5, mb: 2, whiteSpace: 'pre-wrap' }}>
                            {fault.description}
                        </Typography>

                        {/* Photos Gallery */}
                        {photos.length > 0 && (
                            <Box sx={{ mb: 2.5 }}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Photos ({photos.length}):
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                                    {photos.map((photo, idx) => (
                                        <Box
                                            key={idx}
                                            component="button"
                                            type="button"
                                            onClick={() => setViewerIndex(idx)}
                                            aria-label={`View photo ${idx + 1}`}
                                            sx={{
                                                all: 'unset',
                                                cursor: 'pointer',
                                                display: 'block',
                                                borderRadius: '8px',
                                                overflow: 'hidden',
                                                border: '1px solid #ddd',
                                                transition: 'transform 0.2s, box-shadow 0.2s',
                                                '&:hover': {
                                                    transform: 'scale(1.03)',
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
                                                alt={`Fault photo ${idx + 1}`}
                                                sx={{ width: 110, height: 110, objectFit: 'cover', display: 'block' }}
                                            />
                                        </Box>
                                    ))}
                                </Box>
                            </Box>
                        )}

                        {fault.resolutionDescription && (
                            <Box sx={{ mb: 2.5, p: 1.5, borderRadius: 2, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                                <Typography variant="subtitle2" color="success.main" fontWeight={700} gutterBottom>
                                    Resolution Notes & Work Performed:
                                </Typography>
                                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                    {fault.resolutionDescription}
                                </Typography>
                                {fault.resolvedBy && (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                        Resolved by: {formatUserName(fault.resolvedBy?.name) || fault.resolvedBy?.name || fault.resolvedBy?.email || fault.resolvedBy}
                                    </Typography>
                                )}
                            </Box>
                        )}

                        <Typography variant="caption" color="text.secondary" display="block">
                            Reported: {fault.createdAt ? new Date(fault.createdAt).toLocaleString('en-GB') : 'N/A'}
                            {fault.closedAt && ` | Closed: ${new Date(fault.closedAt).toLocaleString('en-GB')}`}
                        </Typography>

                        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', gap: 1.5 }}>
                                {canManage && fault.status === FAULT_STATUS.CLOSED && onReopenFault && (
                                    <Button
                                        variant="contained"
                                        color="warning"
                                        startIcon={<ReplayIcon />}
                                        onClick={() => {
                                            onReopenFault(fault);
                                            handleClose();
                                        }}
                                        sx={{ fontWeight: 700 }}
                                    >
                                        Reopen Fault
                                    </Button>
                                )}
                                {canManage && fault.status !== FAULT_STATUS.CLOSED && onCloseFault && (
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        onClick={() => {
                                            onCloseFault(fault);
                                            handleClose();
                                        }}
                                        sx={{ fontWeight: 700 }}
                                    >
                                        Resolve Fault
                                    </Button>
                                )}
                                {canManage && onDeleteFault && (
                                    <Button
                                        variant="text"
                                        color="error"
                                        startIcon={<DeleteIcon />}
                                        onClick={() => {
                                            onDeleteFault(fault);
                                            handleClose();
                                        }}
                                        sx={{ fontWeight: 600 }}
                                    >
                                        Delete
                                    </Button>
                                )}
                                <Button
                                    variant="outlined"
                                    color="inherit"
                                    startIcon={<CloseIcon />}
                                    onClick={handleClose}
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
                        </Box>
                    </Box>
                </Fade>
            </Modal>

            {/* In-App Image Viewer Dialog */}
            <ImageViewerDialog
                open={viewerIndex !== null}
                onClose={() => setViewerIndex(null)}
                images={photos}
                initialIndex={viewerIndex ?? 0}
                title={`Fault ${fault.code || ''} Photo`}
            />
        </>
    );
}
