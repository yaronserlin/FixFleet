// src/pages/EquipmentsPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Container,
    Typography,
    Box,
    Button,
    TextField,
    InputAdornment,
    Chip,
    ToggleButton,
    ToggleButtonGroup,
    Dialog,
    DialogTitle,
    DialogContent,
    IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewListIcon from '@mui/icons-material/ViewList';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';

import ToolsList from '../components/Tool/ToolsList/ToolsList';
import ErrorComponent from '../components/ErrorComponent/ErrorComponent';
import { usePageRefresh } from '../contexts/PageRefreshContext';
import { PageHeaderSkeleton, FilterBarSkeleton, CardGridSkeleton } from '../components/Skeletons/Skeletons';
import { skeletonA11yProps } from '../components/Skeletons/skeletonA11y';
import { CreateToolForm } from '../components/Tool/ToolForms/ToolForms';
import { useEquipment } from '../contexts/EquipmentContext';
import { useAuth } from '../contexts/AuthContext';
import faultService from '../services/faultsService';
import { ROLES } from '../constants/roles';
import { FAULT_STATUS } from '../constants/faultStatus';

/**
 * Displays an interactive directory of equipment with search, status filtering, and view mode toggle.
 */
export default function EquipmentsPage() {
    const { equipment, loading, error, createEquipment, fetchEquipment } = useEquipment();
    const { user } = useAuth();
    const isAdmin = user?.role === ROLES.ADMIN;

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'faults' | 'operational'
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
    const [openFaultsByTool, setOpenFaultsByTool] = useState({});
    const [createDialogOpen, setCreateDialogOpen] = useState(false);

    // Fetch open faults to mark equipment statuses
    const fetchOpenFaultCounts = useCallback(async () => {
        if (!user || user.mustChangePassword) return;
        try {
            const list = await faultService.getAll();
            const counts = {};
            list.filter(f => f.status === FAULT_STATUS.OPEN).forEach(f => {
                const toolId = f.tool?._id || f.tool;
                if (toolId) {
                    counts[toolId] = (counts[toolId] || 0) + 1;
                }
            });
            setOpenFaultsByTool(counts);
        } catch (err) {
            // Best-effort enhancement: equipment list still renders without
            // open-fault badges if this fails, so just log for diagnostics.
            console.error('Failed to load fault counts for equipment list:', err);
        }
    }, [user]);

    useEffect(() => {
        fetchOpenFaultCounts();
    }, [fetchOpenFaultCounts]);

    // Pull-to-refresh: re-fetch both the equipment list (context) and the
    // open-fault counts (local) that drive this page's status badges.
    const handleRefresh = useCallback(async () => {
        await Promise.all([
            fetchEquipment ? fetchEquipment() : Promise.resolve(),
            fetchOpenFaultCounts(),
        ]);
    }, [fetchEquipment, fetchOpenFaultCounts]);

    usePageRefresh(handleRefresh);

    // Filter equipment by search query and status filter
    const filteredEquipment = useMemo(() => {
        return (equipment || []).filter(item => {
            const openFaults = openFaultsByTool[item._id] || 0;
            if (statusFilter === 'faults' && openFaults === 0) return false;
            if (statusFilter === 'operational' && openFaults > 0) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const name = (item.name || '').toLowerCase();
                const model = (item.model || '').toLowerCase();
                const sn = (item.serialNumber || '').toLowerCase();
                const localSn = (item.localSerialNumber || '').toLowerCase();
                return name.includes(q) || model.includes(q) || sn.includes(q) || localSn.includes(q);
            }
            return true;
        });
    }, [equipment, openFaultsByTool, statusFilter, searchQuery]);

    const handleCreateSubmit = async (data) => {
        await createEquipment(data);
        setCreateDialogOpen(false);
    };

    if (error) {
        return <ErrorComponent message={error} />;
    }

    if (loading && (!equipment || equipment.length === 0)) {
        return (
            <Container maxWidth="xl" sx={{ mt: 3, mb: 6 }} {...skeletonA11yProps('Loading equipment fleet')}>
                <PageHeaderSkeleton actions={isAdmin ? 1 : 0} />
                <FilterBarSkeleton chips={3} sx={{ mb: 3 }} />
                <CardGridSkeleton count={6} height={210} />
            </Container>
        );
    }

    const faultyCount = Object.keys(openFaultsByTool).length;
    const operationalCount = Math.max(0, (equipment?.length || 0) - faultyCount);

    return (
        <Container maxWidth="xl" sx={{ mt: 3, mb: 6 }}>
            {/* Header with Title and Add Action */}
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
                    <Typography variant="h4" fontWeight={800} letterSpacing="-0.02em">
                        Equipment Fleet
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Manage machinery, operating hours, maintenance logs, and service manuals
                    </Typography>
                </Box>

                {isAdmin && (
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon />}
                        onClick={() => setCreateDialogOpen(true)}
                        sx={{ fontWeight: 700, minHeight: 44 }}
                    >
                        Add Equipment
                    </Button>
                )}
            </Box>

            {/* Filter and View Controls Bar */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 2,
                    mb: 3,
                }}
            >
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap', width: { xs: '100%', md: 'auto' } }}>
                    <TextField
                        size="small"
                        placeholder="Search equipment, serial, model..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ width: { xs: '100%', sm: 260 } }}
                    />

                    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                        <Chip
                            label={`All (${equipment?.length || 0})`}
                            size="small"
                            variant={statusFilter === 'all' ? 'filled' : 'outlined'}
                            color={statusFilter === 'all' ? 'primary' : 'default'}
                            onClick={() => setStatusFilter('all')}
                            sx={{ fontWeight: 600, cursor: 'pointer' }}
                        />
                        <Chip
                            label={`Operational (${operationalCount})`}
                            size="small"
                            variant={statusFilter === 'operational' ? 'filled' : 'outlined'}
                            color={statusFilter === 'operational' ? 'success' : 'default'}
                            onClick={() => setStatusFilter('operational')}
                            sx={{ fontWeight: 600, cursor: 'pointer' }}
                        />
                        <Chip
                            label={`Needs Attention (${faultyCount})`}
                            size="small"
                            variant={statusFilter === 'faults' ? 'filled' : 'outlined'}
                            color={statusFilter === 'faults' ? 'error' : 'default'}
                            onClick={() => setStatusFilter('faults')}
                            sx={{ fontWeight: 600, cursor: 'pointer' }}
                        />
                    </Box>
                </Box>

                <ToggleButtonGroup
                    value={viewMode}
                    exclusive
                    onChange={(e, val) => val && setViewMode(val)}
                    size="small"
                    aria-label="view layout"
                >
                    <ToggleButton value="grid" aria-label="card grid view">
                        <ViewModuleIcon fontSize="small" />
                    </ToggleButton>
                    <ToggleButton value="table" aria-label="table view">
                        <ViewListIcon fontSize="small" />
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>

            {/* Equipment Grid or Table */}
            <ToolsList
                tools={filteredEquipment}
                viewMode={viewMode}
                loading={loading}
                openFaultsByTool={openFaultsByTool}
            />

            {/* Add Equipment Dialog for Admins */}
            <Dialog
                open={createDialogOpen}
                onClose={() => setCreateDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
                    <Typography variant="h6" fontWeight={700}>Register New Equipment</Typography>
                    <IconButton size="small" onClick={() => setCreateDialogOpen(false)}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ pt: 2 }}>
                    <CreateToolForm onSubmit={handleCreateSubmit} />
                </DialogContent>
            </Dialog>
        </Container>
    );
}
