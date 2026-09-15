// src/components/ImageViewer/ImageViewerDialog.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    IconButton,
    Box,
    Typography,
    CircularProgress,
    Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { getMediaUrl } from '../../utils/mediaUtils';
import { useAuthenticatedBlobUrl } from '../../hooks/useAuthenticatedBlobUrl';

/**
 * In-app Image Viewer dialog so users never have to leave the application to inspect photos.
 * Supports multiple images with arrow navigation, downloads, and keyboard shortcuts.
 *
 * Each image lives behind an auth-protected `/uploads/:filename` route, so
 * the currently-viewed image is fetched via `useAuthenticatedBlobUrl`
 * (through `apiClient`, which attaches a fresh Bearer token and
 * auto-refreshes on 401) rather than bound directly to `<img src>` -- that
 * can't attach an Authorization header, so it'd otherwise depend on a
 * short-lived cookie that can expire between API calls and show a raw 401
 * JSON body in place of the photo.
 */
export default function ImageViewerDialog({
    open,
    onClose,
    images = [],
    imageUrl = '',
    initialIndex = 0,
    title = 'Image Preview',
}) {
    // Normalize images into an array of resolved URLs
    const imageList = React.useMemo(() => {
        if (Array.isArray(images) && images.length > 0) {
            return images.map((img) => getMediaUrl(img));
        }
        if (imageUrl) {
            return [getMediaUrl(imageUrl)];
        }
        return [];
    }, [images, imageUrl]);

    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    // Sync currentIndex when initialIndex or image list changes
    useEffect(() => {
        if (initialIndex >= 0 && initialIndex < imageList.length) {
            setCurrentIndex(initialIndex);
        } else {
            setCurrentIndex(0);
        }
    }, [initialIndex, imageList]);

    const handlePrev = useCallback(() => {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : imageList.length - 1));
    }, [imageList.length]);

    const handleNext = useCallback(() => {
        setCurrentIndex((prev) => (prev < imageList.length - 1 ? prev + 1 : 0));
    }, [imageList.length]);

    // Keyboard navigation
    useEffect(() => {
        if (!open || imageList.length <= 1) return;

        const handleKeyDown = (e) => {
            if (e.key === 'ArrowLeft') {
                handlePrev();
            } else if (e.key === 'ArrowRight') {
                handleNext();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, imageList.length, handlePrev, handleNext]);

    const currentImage = imageList[currentIndex];
    const { blobUrl, loading, error } = useAuthenticatedBlobUrl(open ? currentImage : null);

    if (!open || imageList.length === 0) return null;

    const displayTitle = imageList.length > 1
        ? `${title} (${currentIndex + 1} of ${imageList.length})`
        : title;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            aria-labelledby="image-viewer-dialog-title"
        >
            <DialogTitle
                component="div"
                id="image-viewer-dialog-title"
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    py: 1.5,
                    px: 3,
                }}
            >
                <Typography variant="h6" component="div" noWrap sx={{ maxWidth: '75%', fontWeight: 600 }}>
                    {displayTitle}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Button
                        size="small"
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        href={blobUrl || undefined}
                        disabled={!blobUrl}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Download
                    </Button>
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
                dividers
                sx={{
                    p: 0,
                    position: 'relative',
                    backgroundColor: '#121212',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: { xs: 300, sm: 450 },
                    maxHeight: '75vh',
                    overflow: 'hidden',
                }}
            >
                {/* Previous button if multiple photos */}
                {imageList.length > 1 && (
                    <IconButton
                        onClick={handlePrev}
                        aria-label="Previous image"
                        sx={{
                            position: 'absolute',
                            left: 12,
                            zIndex: 2,
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            color: '#fff',
                            '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.8)' },
                        }}
                    >
                        <ChevronLeftIcon fontSize="large" />
                    </IconButton>
                )}

                {/* Main Image */}
                {loading && <CircularProgress size={32} sx={{ color: '#fff' }} />}

                {!loading && error && (
                    <Alert severity="error" sx={{ maxWidth: 360, mx: 2 }}>
                        Couldn&apos;t load this photo{error.response?.status === 404 ? ' (not found)' : ''}. It may have been removed, or your session may need refreshing.
                    </Alert>
                )}

                {!loading && !error && blobUrl && (
                    <Box
                        component="img"
                        src={blobUrl}
                        alt={displayTitle}
                        sx={{
                            maxWidth: '100%',
                            maxHeight: '70vh',
                            objectFit: 'contain',
                            display: 'block',
                            userSelect: 'none',
                        }}
                    />
                )}

                {/* Next button if multiple photos */}
                {imageList.length > 1 && (
                    <IconButton
                        onClick={handleNext}
                        aria-label="Next image"
                        sx={{
                            position: 'absolute',
                            right: 12,
                            zIndex: 2,
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            color: '#fff',
                            '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.8)' },
                        }}
                    >
                        <ChevronRightIcon fontSize="large" />
                    </IconButton>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 1.5, justifyContent: 'space-between' }}>
                <Typography variant="caption" color="text.secondary">
                    {imageList.length > 1 ? 'Use arrow keys or buttons to navigate' : ''}
                </Typography>
                <Button onClick={onClose} color="inherit">
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
}
