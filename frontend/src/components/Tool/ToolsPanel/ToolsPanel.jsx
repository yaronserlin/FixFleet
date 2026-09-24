import React, { useState, useCallback, useMemo } from 'react';
import {
    Grid,
    Paper,
    Typography,
    Button,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    IconButton,
    TableContainer,
    Box,
    TextField,
    InputAdornment,
    Skeleton,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';

import { CreateToolForm, UpdateToolForm } from '../ToolForms/ToolForms';
import { TableSkeleton } from '../../Skeletons/Skeletons';
import { skeletonA11yProps } from '../../Skeletons/skeletonA11y';
import ErrorComponent from '../../ErrorComponent/ErrorComponent';
import DialogComponent from '../../DialogComponent';

/**
 * ToolsPanel: Equipment list + CRUD dialogs for admin management.
 */
export default function ToolsPanel({ tools = [], loading, error, onCreate, onUpdate, onDelete }) {
    const [dialog, setDialog] = useState({ type: null, tool: null });
    const [searchQuery, setSearchQuery] = useState('');

    const openDialog = useCallback((type, tool = null) => setDialog({ type, tool }), []);
    const closeDialog = useCallback(() => setDialog({ type: null, tool: null }), []);

    const handleCreate = useCallback(
        async (data) => {
            await onCreate(data);
            closeDialog();
        },
        [onCreate, closeDialog]
    );

    const handleUpdate = useCallback(
        async (data) => {
            await onUpdate(dialog.tool._id, data);
            closeDialog();
        },
        [onUpdate, dialog.tool, closeDialog]
    );

    const handleDelete = useCallback(
        async () => {
            await onDelete(dialog.tool._id);
            closeDialog();
        },
        [onDelete, dialog.tool, closeDialog]
    );

    const filteredTools = useMemo(() => {
        if (!searchQuery.trim()) return tools;
        const q = searchQuery.toLowerCase();
        return tools.filter(t =>
            (t.name || '').toLowerCase().includes(q) ||
            (t.localSerialNumber || '').toLowerCase().includes(q) ||
            (t.serialNumber || '').toLowerCase().includes(q) ||
            (t.model || '').toLowerCase().includes(q)
        );
    }, [tools, searchQuery]);

    const body = loading ? (
        <Box {...skeletonA11yProps('Loading equipment')}>
            <Skeleton variant="rounded" height={40} sx={{ borderRadius: 1, mb: 2 }} />
            <TableSkeleton rows={5} columns={4} />
        </Box>
    ) : error ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <ErrorComponent message={error} />
        </Box>
    ) : (
        <>
            <TextField
                size="small"
                placeholder="Filter equipment by name or serial..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                fullWidth
                slotProps={{ input: {
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                    ),
                } }}
                sx={{ mb: 2 }}
            />
            {/* Mobile Card View (< sm) */}
            <Box sx={{ display: { xs: 'flex', sm: 'none' }, flexDirection: 'column', gap: 1.5 }}>
                {filteredTools.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
                        No equipment found matching "{searchQuery}"
                    </Typography>
                ) : (
                    filteredTools.map((t) => (
                        <Paper
                            key={t._id}
                            variant="outlined"
                            sx={{
                                p: 1.75,
                                borderRadius: 2,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}
                        >
                            <Box sx={{ minWidth: 0, mr: 1 }}>
                                <Typography variant="body2" fontWeight={700} noWrap>
                                    {t.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                    {t.localSerialNumber ? `Unit #${t.localSerialNumber}` : (t.serialNumber || 'No S/N')}
                                    {t.model ? ` • ${t.model}` : ''}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                                <IconButton
                                    size="small"
                                    onClick={() => openDialog('update', t)}
                                    title="Edit Equipment"
                                    aria-label={`Edit ${t.name}`}
                                >
                                    <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    onClick={() => openDialog('delete', t)}
                                    color="error"
                                    title="Delete Equipment"
                                    aria-label={`Delete ${t.name}`}
                                >
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </Box>
                        </Paper>
                    ))
                )}
            </Box>

            {/* Desktop Table (>= sm) */}
            <TableContainer sx={{ display: { xs: 'none', sm: 'block' }, width: '100%', overflowX: 'auto' }}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Serial / Unit #</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredTools.map((t) => (
                            <TableRow key={t._id} hover>
                                <TableCell>
                                    <Typography variant="body2" fontWeight={600}>
                                        {t.name}
                                    </Typography>
                                    {t.model && (
                                        <Typography variant="caption" color="text.secondary" display="block">
                                            {t.model}
                                        </Typography>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {t.localSerialNumber ? (
                                        <strong>{t.localSerialNumber}</strong>
                                    ) : (
                                        t.serialNumber || '-'
                                    )}
                                </TableCell>
                                <TableCell align="right">
                                    <IconButton
                                        size="small"
                                        onClick={() => openDialog('update', t)}
                                        title="Edit Equipment"
                                        aria-label={`Edit ${t.name}`}
                                    >
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        onClick={() => openDialog('delete', t)}
                                        color="error"
                                        title="Delete Equipment"
                                        aria-label={`Delete ${t.name}`}
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </>
    );

    return (
        <Grid size={{ xs: 12, lg: 6 }}>
            <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 2 }}>
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        justifyContent: 'space-between',
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        gap: 1.5,
                        mb: 2,
                    }}
                >
                    <Box>
                        <Typography variant="h6" fontWeight={700}>
                            Equipment Fleet
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {tools.length} registered machines
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => openDialog('create')}
                        sx={{ width: { xs: '100%', sm: 'auto' } }}
                    >
                        Add Equipment
                    </Button>
                </Box>
                {body}
            </Paper>

            {/* Create / Update */}
            <DialogComponent
                open={dialog.type === 'create' || dialog.type === 'update'}
                onClose={closeDialog}
                title={dialog.type === 'update' ? 'Update Equipment' : 'Create Equipment'}
            >
                {dialog.type === 'update' ? (
                    <UpdateToolForm
                        initialData={dialog.tool}
                        onSubmit={handleUpdate}
                        onCancel={closeDialog}
                    />
                ) : (
                    <CreateToolForm
                        onSubmit={handleCreate}
                        onCancel={closeDialog}
                    />
                )}
            </DialogComponent>

            {/* Delete */}
            <DialogComponent
                open={dialog.type === 'delete'}
                onClose={closeDialog}
                title="Confirm Delete"
                submitButtonText="Delete"
                cancelButtonText="Cancel"
                onSubmit={handleDelete}
            >
                <Typography>
                    Are you sure you want to delete <strong>“{dialog.tool?.name}”</strong>?
                    This will also delete all associated faults and maintenance records.
                </Typography>
            </DialogComponent>
        </Grid>
    );
}
