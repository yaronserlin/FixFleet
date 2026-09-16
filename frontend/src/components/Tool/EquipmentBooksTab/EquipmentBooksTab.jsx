// src/components/Tool/EquipmentBooksTab/EquipmentBooksTab.jsx
import React, { useState } from 'react';
import {
    Box,
    Typography,
    Button,
    Grid,
    Card,
    CardContent,
    CardActions,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Alert,
    LinearProgress,
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
import { styled } from '@mui/material/styles';
import { useAuth } from '../../../contexts/AuthContext';
import { isMechanicOrAdmin } from '../../../constants/roles';
import { useNotify } from '../../../contexts/NotificationContext';
import equipmentService from '../../../services/equipmentService';
import { getMediaUrl } from '../../../utils/mediaUtils';
import PdfViewerDialog from '../../PdfViewer/PdfViewerDialog';
import ConfirmDialog from '../../ConfirmDialog/ConfirmDialog';

const VisuallyHiddenInput = styled('input')({
    clip: 'rect(0 0 0 0)',
    clipPath: 'inset(50%)',
    height: 1,
    overflow: 'hidden',
    position: 'absolute',
    bottom: 0,
    left: 0,
    whiteSpace: 'nowrap',
    width: 1,
});

export default function EquipmentBooksTab({ equipment, tool, onRefresh }) {
    const eq = equipment || tool;
    const { user } = useAuth();
    const notify = useNotify();
    const canManageBooks = isMechanicOrAdmin(user?.role);

    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [bookTitle, setBookTitle] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    // Background upload task, tracked outside the dialog's own state so the
    // dialog can close immediately on submit instead of blocking on the
    // request -- the progress bar below the header keeps running either way.
    const [uploadTask, setUploadTask] = useState(null); // { name, progress } | null

    // In-App PDF viewer state
    const [activePdf, setActivePdf] = useState(null);

    // Delete confirmation dialog state
    const [deletingBookId, setDeletingBookId] = useState(null);

    const books = eq?.books || [];

    const handleOpenUpload = () => {
        setBookTitle('');
        setSelectedFile(null);
        setUploadDialogOpen(true);
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                notify.error('Only PDF files are supported');
                return;
            }
            if (file.size > 50 * 1024 * 1024) {
                notify.error('File size exceeds 50MB limit');
                return;
            }
            setSelectedFile(file);
            if (!bookTitle) {
                const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
                setBookTitle(nameWithoutExt);
            }
        }
    };

    const handleUploadSubmit = (e) => {
        e.preventDefault();
        if (!selectedFile || !bookTitle.trim() || uploadTask) return;

        const title = bookTitle.trim();
        const file = selectedFile;

        // Close and reset the dialog right away -- the upload continues in
        // the background (tracked by uploadTask below) so a large PDF on a
        // slow connection never reads as a frozen UI.
        setUploadDialogOpen(false);
        setSelectedFile(null);
        setBookTitle('');
        setUploadTask({ name: file.name, progress: 0 });

        const formData = new FormData();
        formData.append('title', title);
        formData.append('book', file);

        equipmentService
            .uploadBook(eq._id, formData, {
                onUploadProgress: (evt) => {
                    if (!evt.total) return;
                    setUploadTask(prev => (prev ? { ...prev, progress: Math.round((evt.loaded / evt.total) * 100) } : prev));
                },
            })
            .then(() => {
                notify.success('PDF manual uploaded successfully');
                onRefresh?.();
            })
            .catch((err) => {
                console.error('Book upload error:', err);
                notify.error(`Failed to upload "${title}"`);
            })
            .finally(() => setUploadTask(null));
    };

    const handleConfirmDeleteBook = async () => {
        if (!deletingBookId || !eq?._id) return;
        try {
            await equipmentService.deleteBook(eq._id, deletingBookId);
            notify.success('Manual removed');
            setDeletingBookId(null);
            onRefresh?.();
        } catch (err) {
            console.error('Delete book error:', err);
            notify.error('Failed to delete book');
            setDeletingBookId(null);
        }
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return '';
        if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(1)} KB`;
        }
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <Box sx={{ py: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                <Typography variant="h6">Equipment Manuals & Books</Typography>
                {canManageBooks && (
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleOpenUpload}
                        disabled={Boolean(uploadTask)}
                    >
                        Upload
                    </Button>
                )}
            </Box>

            {uploadTask && (
                <Box sx={{ mb: 3, p: 1.5, borderRadius: 1, bgcolor: 'action.hover' }}>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', mb: 0.5 }}>
                        Uploading &quot;{uploadTask.name}&quot;… {uploadTask.progress}%
                    </Typography>
                    <LinearProgress variant="determinate" value={uploadTask.progress} sx={{ borderRadius: 1 }} />
                </Box>
            )}

            {books.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                    No PDF manuals or workshop books uploaded for this equipment.
                    {canManageBooks && ' Click "+ Upload" to attach equipment service documentation.'}
                </Typography>
            ) : (
                <Grid container spacing={2}>
                    {books.map((book) => (
                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={book._id}>
                            <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                <CardContent sx={{ flexGrow: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                                        <PictureAsPdfIcon color="error" sx={{ fontSize: 36 }} />
                                        <Box>
                                            <Typography variant="subtitle1" fontWeight="bold" noWrap sx={{ maxWidth: 220 }}>
                                                {book.title}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                {formatFileSize(book.fileSize)}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Typography variant="caption" color="text.secondary" display="block">
                                        Uploaded: {book.uploadedAt ? new Date(book.uploadedAt).toLocaleDateString('en-GB') : 'N/A'}
                                    </Typography>
                                </CardContent>
                                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 1.5 }}>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<VisibilityIcon />}
                                        onClick={() => setActivePdf({
                                             title: book.title,
                                             url: getMediaUrl(book.fileUrl),
                                        })}
                                    >
                                        View
                                    </Button>
                                    {canManageBooks && (
                                        <IconButton
                                            size="small"
                                            color="error"
                                            title="Delete"
                                            onClick={() => setDeletingBookId(book._id)}
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    )}
                                </CardActions>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* In-App PDF Viewer Dialog */}
            <PdfViewerDialog
                open={Boolean(activePdf)}
                onClose={() => setActivePdf(null)}
                title={activePdf?.title}
                fileUrl={activePdf?.url}
            />

            {/* Delete Book Confirmation Dialog */}
            <ConfirmDialog
                open={Boolean(deletingBookId)}
                title="Confirm Delete"
                message="Are you sure you want to permanently delete this manual/book from this equipment?"
                confirmText="Delete"
                cancelText="Cancel"
                confirmColor="error"
                onConfirm={handleConfirmDeleteBook}
                onCancel={() => setDeletingBookId(null)}
            />

            {/* Upload PDF Modal */}
            <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Upload Equipment Manual</DialogTitle>
                <Box component="form" onSubmit={handleUploadSubmit}>
                    <DialogContent dividers>
                        <Alert severity="info" sx={{ mb: 2 }}>
                            Supports PDF documents up to 50MB (e.g. operator manual, wiring schematics, parts catalog).
                        </Alert>
                        <TextField
                            label="Manual Title"
                            fullWidth
                            required
                            placeholder="e.g. Operator Handbook & Maintenance Guide"
                            value={bookTitle}
                            onChange={(e) => setBookTitle(e.target.value)}
                            sx={{ mb: 2.5 }}
                        />
                        <Button
                            component="label"
                            variant="outlined"
                            startIcon={<CloudUploadIcon />}
                            fullWidth
                            sx={{ py: 1.5 }}
                        >
                            {selectedFile ? `Selected: ${selectedFile.name}` : 'Select PDF Document'}
                            <VisuallyHiddenInput
                                type="file"
                                accept="application/pdf"
                                onChange={handleFileChange}
                            />
                        </Button>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setUploadDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={!selectedFile || !bookTitle.trim()}
                        >
                            Upload
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>
        </Box>
    );
}
