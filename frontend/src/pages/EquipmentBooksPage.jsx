// src/pages/EquipmentBooksPage.jsx
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
    Container,
    Grid,
    Card,
    CardContent,
    Typography,
    Box,
    Button,
    TextField,
    InputAdornment,
    Chip,
    Paper,
    Divider,
    IconButton,
    Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import CloseIcon from '@mui/icons-material/Close';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';

import equipmentService from '../services/equipmentService';
import { getMediaUrl } from '../utils/mediaUtils';
import { useNotify } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import PdfViewerDialog from '../components/PdfViewer/PdfViewerDialog';
import { usePageRefresh } from '../contexts/PageRefreshContext';
import { CardGridSkeleton } from '../components/Skeletons/Skeletons';
import { skeletonA11yProps } from '../components/Skeletons/skeletonA11y';

function formatFileSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function EquipmentBooksPage() {
    const { user } = useAuth();
    const notify = useNotify();
    const [tools, setTools] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activePdf, setActivePdf] = useState(null);

    const fetchEquipment = useCallback(async ({ showSkeleton = true } = {}) => {
        if (!user || user.mustChangePassword) return;
        try {
            if (showSkeleton) setLoading(true);
            const data = await equipmentService.getAll();
            setTools(data || []);
        } catch (err) {
            console.error('Failed to load equipment manuals:', err);
            notify.error('Failed to load equipment manuals');
        } finally {
            setLoading(false);
        }
    }, [notify, user]);

    useEffect(() => {
        fetchEquipment();
    }, [fetchEquipment]);

    const handleRefresh = useCallback(
        () => fetchEquipment({ showSkeleton: false }),
        [fetchEquipment]
    );
    usePageRefresh(handleRefresh);

    // Only show equipment that actually has books/manuals uploaded
    const toolsWithBooks = useMemo(() => {
        return (tools || []).filter(tool => tool.books && tool.books.length > 0);
    }, [tools]);

    const filteredTools = useMemo(() => {
        if (!searchQuery.trim()) return toolsWithBooks;
        const q = searchQuery.toLowerCase();
        return toolsWithBooks.filter(tool => {
            const matchesName = (tool.name || '').toLowerCase().includes(q);
            const matchesModel = (tool.model || '').toLowerCase().includes(q);
            const matchesSerial = (tool.serialNumber || '').toLowerCase().includes(q);
            const matchesLocal = (tool.localSerialNumber || '').toLowerCase().includes(q);
            const matchesBook = (tool.books || []).some(b => (b.title || '').toLowerCase().includes(q));
            return matchesName || matchesModel || matchesSerial || matchesLocal || matchesBook;
        });
    }, [toolsWithBooks, searchQuery]);

    const totalBooks = useMemo(() => {
        return toolsWithBooks.reduce((acc, t) => acc + (t.books?.length || 0), 0);
    }, [toolsWithBooks]);

    return (
        <Container maxWidth="xl" sx={{ mt: 3, mb: 6 }}>
            {/* Header */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: 2,
                    mb: 3.5,
                }}
            >
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 0.5 }}>
                        <MenuBookIcon color="primary" sx={{ fontSize: 30 }} />
                        <Typography variant="h4" fontWeight={800} letterSpacing="-0.02em">
                            Equipment Manuals & Books
                        </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                        Browse operator manuals, workshop books, and technical specifications for each machine.
                    </Typography>
                </Box>
                <Chip
                    icon={<MenuBookIcon sx={{ fontSize: 16 }} />}
                    label={`${totalBooks} Manuals Available`}
                    color="primary"
                    variant="outlined"
                    sx={{ fontWeight: 700, height: 32 }}
                />
            </Box>

            {/* Search Bar */}
            <Paper
                variant="outlined"
                sx={{
                    p: 2,
                    mb: 3,
                    borderRadius: 3,
                    display: 'flex',
                    alignItems: 'center',
                }}
            >
                <TextField
                    fullWidth
                    size="small"
                    placeholder="Search by equipment name, model, serial number, or manual title..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                            </InputAdornment>
                        ),
                    }}
                />
            </Paper>

            {/* Tools Grid */}
            {loading ? (
                <Box {...skeletonA11yProps('Loading equipment manuals')}>
                    <CardGridSkeleton count={4} height={220} size={{ xs: 12, md: 6 }} spacing={2.5} />
                </Box>
            ) : filteredTools.length === 0 ? (
                <Paper
                    variant="outlined"
                    sx={{
                        p: { xs: 4, sm: 6 },
                        textAlign: 'center',
                        borderRadius: 3,
                    }}
                >
                    <MenuBookIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                        No equipment manuals found
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mx: 'auto', mb: 2 }}>
                        {searchQuery
                            ? `No machines or manuals matched "${searchQuery}".`
                            : 'No equipment has manuals uploaded yet.'}
                    </Typography>
                    {searchQuery && (
                        <Button variant="outlined" onClick={() => setSearchQuery('')}>
                            Clear Search
                        </Button>
                    )}
                </Paper>
            ) : (
                <Grid container spacing={2.5}>
                    {filteredTools.map(tool => {
                        const books = tool.books || [];
                        const hasBooks = books.length > 0;

                        return (
                            <Grid size={{ xs: 12, md: 6 }} key={tool._id}>
                                <Card
                                    variant="outlined"
                                    sx={{
                                        borderRadius: 3,
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        borderLeft: '4px solid #2563EB',
                                    }}
                                >
                                    <CardContent sx={{ p: 2.5, flexGrow: 1 }}>
                                        {/* Equipment Title & Badges */}
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                                                <Box
                                                    sx={{
                                                        p: 1,
                                                        borderRadius: 2,
                                                        bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(37,99,235,0.15)' : 'rgba(37,99,235,0.08)',
                                                        color: 'primary.main',
                                                        display: 'flex',
                                                    }}
                                                >
                                                    <PrecisionManufacturingIcon />
                                                </Box>
                                                <Box>
                                                    <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
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
                                                label={`${books.length} ${books.length === 1 ? 'Book' : 'Books'}`}
                                                size="small"
                                                color={hasBooks ? 'primary' : 'default'}
                                                variant={hasBooks ? 'filled' : 'outlined'}
                                                sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                                            />
                                        </Box>

                                        {/* Info Specs */}
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
                                            {tool.model && (
                                                <Typography variant="caption" color="text.secondary">
                                                    <strong>Model:</strong> {tool.model}
                                                </Typography>
                                            )}
                                            {tool.serialNumber && (
                                                <Typography variant="caption" color="text.secondary">
                                                    <strong>S/N:</strong> {tool.serialNumber}
                                                </Typography>
                                            )}
                                        </Box>

                                        <Divider sx={{ mb: 2 }} />

                                        {/* Books List */}
                                        {!hasBooks ? (
                                            <Box sx={{ py: 2, textAlign: 'center' }}>
                                                <Typography variant="body2" color="text.secondary">
                                                    No PDF manuals or workshop documentation uploaded for this machine yet.
                                                </Typography>
                                            </Box>
                                        ) : (
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                                                {books.map(book => {
                                                    const mediaUrl = getMediaUrl(book.fileUrl);
                                                    return (
                                                        <Paper
                                                            key={book._id}
                                                            variant="outlined"
                                                            sx={{
                                                                p: 1.5,
                                                                borderRadius: 2,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                                gap: 1.5,
                                                                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                                                            }}
                                                        >
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                                                                <PictureAsPdfIcon color="error" sx={{ fontSize: 28, flexShrink: 0 }} />
                                                                <Box sx={{ minWidth: 0 }}>
                                                                    <Typography variant="body2" fontWeight={600} noWrap>
                                                                        {book.title}
                                                                    </Typography>
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        {formatFileSize(book.fileSize)}
                                                                        {book.uploadedAt && ` • ${new Date(book.uploadedAt).toLocaleDateString('en-GB')}`}
                                                                    </Typography>
                                                                </Box>
                                                            </Box>

                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
                                                                <Button
                                                                    size="small"
                                                                    variant="outlined"
                                                                    color="primary"
                                                                    startIcon={<VisibilityIcon fontSize="small" />}
                                                                    onClick={() => setActivePdf({ title: book.title, url: mediaUrl })}
                                                                    sx={{ fontWeight: 600, fontSize: '0.75rem', px: 1.25 }}
                                                                >
                                                                    View
                                                                </Button>
                                                                <Tooltip title="Download file" arrow>
                                                                    <IconButton
                                                                        size="small"
                                                                        component="a"
                                                                        href={mediaUrl}
                                                                        download
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        aria-label={`Download ${book.title}`}
                                                                    >
                                                                        <DownloadIcon fontSize="small" />
                                                                    </IconButton>
                                                                </Tooltip>
                                                            </Box>
                                                        </Paper>
                                                    );
                                                })}
                                            </Box>
                                        )}
                                    </CardContent>
                                </Card>
                            </Grid>
                        );
                    })}
                </Grid>
            )}

            {/* Mobile-Responsive PDF Viewer Dialog */}
            <PdfViewerDialog
                open={Boolean(activePdf)}
                onClose={() => setActivePdf(null)}
                title={activePdf?.title}
                fileUrl={activePdf?.url}
            />
        </Container>
    );
}
