import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    IconButton,
    Box,
    Typography,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

/**
 * Mobile-responsive PDF document viewer dialog with native viewer fallback.
 */
export default function PdfViewerDialog({ open, onClose, title, fileUrl }) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    if (!fileUrl) return null;

    const handleOpenExternal = () => {
        window.open(fileUrl, '_blank', 'noopener,noreferrer');
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullScreen={isMobile}
            maxWidth="lg"
            fullWidth
            PaperProps={{
                sx: {
                    minHeight: isMobile ? '100dvh' : '82vh',
                    borderRadius: isMobile ? 0 : 3,
                },
            }}
            aria-labelledby="pdf-viewer-dialog-title"
        >
            <DialogTitle
                component="div"
                id="pdf-viewer-dialog-title"
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    py: 1.5,
                    px: { xs: 2, sm: 3 },
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, maxWidth: { xs: '60%', sm: '70%' } }}>
                    <PictureAsPdfIcon color="error" fontSize="small" />
                    <Typography variant="subtitle1" fontWeight={700} noWrap>
                        {title || 'Document Manual'}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        startIcon={<OpenInNewIcon fontSize="small" />}
                        onClick={handleOpenExternal}
                        sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' }, px: { xs: 1, sm: 1.5 } }}
                    >
                        {isMobile ? 'Full View' : 'Open in Tab'}
                    </Button>
                    <IconButton
                        size="small"
                        component="a"
                        href={fileUrl}
                        download
                        title="Download manual"
                        sx={{ color: 'text.secondary' }}
                    >
                        <DownloadIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                        aria-label="close"
                        onClick={onClose}
                        sx={{ color: 'text.secondary' }}
                    >
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent
                sx={{
                    p: 0,
                    height: isMobile ? 'calc(100dvh - 110px)' : '75vh',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    bgcolor: 'background.default',
                }}
            >
                <Box
                    component="object"
                    data={fileUrl}
                    type="application/pdf"
                    sx={{
                        width: '100%',
                        flexGrow: 1,
                        border: 'none',
                        WebkitOverflowScrolling: 'touch',
                    }}
                >
                    <Box
                        component="iframe"
                        src={fileUrl}
                        title={title || 'PDF Document'}
                        sx={{
                            width: '100%',
                            height: '100%',
                            border: 'none',
                            WebkitOverflowScrolling: 'touch',
                        }}
                    >
                        <Box sx={{ p: 3, textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Your browser cannot display this PDF directly.
                            </Typography>
                            <Button variant="contained" onClick={handleOpenExternal}>
                                Open PDF in Browser
                            </Button>
                        </Box>
                    </Box>
                </Box>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                <Button onClick={onClose} color="inherit">
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
}
