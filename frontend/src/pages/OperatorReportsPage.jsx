// src/pages/OperatorReportsPage.jsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
    Container,
    Grid,
    Typography,
    Box,
    Button,
    TextField,
    InputAdornment,
    Chip,
    Paper,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlineOutlined';

import { useAuth } from '../contexts/AuthContext';
import { useNotify } from '../contexts/NotificationContext';
import { useEquipment } from '../contexts/EquipmentContext';
import { useFault } from '../contexts/FaultContext';
import faultService from '../services/faultsService';
import { ROLES } from '../constants/roles';
import { FAULT_STATUS } from '../constants/faultStatus';
import FaultCard from '../components/Fault/FaultCard/FaultCard';
import FaultDetailsDialog from '../components/Fault/FaultDetailsDialog/FaultDetailsDialog';
import CreateFaultDialog from '../components/Fault/CreateFaultDialog/CreateFaultDialog';
import { usePageRefresh } from '../contexts/PageRefreshContext';
import { CardGridSkeleton } from '../components/Skeletons/Skeletons';
import { skeletonA11yProps } from '../components/Skeletons/skeletonA11y';

export default function OperatorReportsPage() {
    const { user } = useAuth();
    const notify = useNotify();
    const { fetchEquipment } = useEquipment();
    const { fetchFaults } = useFault();

    const [faults, setFaults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedFault, setSelectedFault] = useState(null);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);

    // `showSkeleton: false` re-fetches without blanking the list -- used by
    // pull-to-refresh, which draws its own indicator above the content.
    const fetchReports = useCallback(async ({ showSkeleton = true } = {}) => {
        if (!user || user.mustChangePassword) return;
        try {
            if (showSkeleton) setLoading(true);
            const data = await faultService.getAll();
            const uid = user?.id || user?._id;
            // Filter to current user's reported faults if user is operator
            const myFaults = (data || []).filter(f => {
                const opId = f.operator?._id || f.operator;
                return user?.role === ROLES.OPERATOR ? opId === uid : true;
            });
            setFaults(myFaults);
        } catch (err) {
            console.error('Failed to load reports:', err);
            notify.error('Failed to load reports');
        } finally {
            setLoading(false);
        }
    }, [user, notify]);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    const handleRefresh = useCallback(() => fetchReports({ showSkeleton: false }), [fetchReports]);
    usePageRefresh(handleRefresh);

    const handleCreateFault = async (values) => {
        try {
            await faultService.create({ ...values, operator: user?.id || user?._id });
            notify.success('Fault reported successfully');
            setCreateDialogOpen(false);
            await Promise.all([
                fetchReports({ showSkeleton: false }),
                fetchEquipment ? fetchEquipment() : Promise.resolve(),
                fetchFaults ? fetchFaults() : Promise.resolve(),
            ]);
        } catch (err) {
            notify.error(err.response?.data?.message || 'Failed to report fault');
        }
    };

    const filteredFaults = useMemo(() => {
        const sorted = [...faults].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return sorted.filter(fault => {
            if (statusFilter !== 'all' && fault.status !== statusFilter) return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                return (
                    (fault.code || '').toLowerCase().includes(q) ||
                    (fault.description || '').toLowerCase().includes(q) ||
                    (fault.tool?.name || '').toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [faults, statusFilter, searchQuery]);

    const openCount = useMemo(() => faults.filter(f => f.status === FAULT_STATUS.OPEN).length, [faults]);
    const resolvedCount = useMemo(() => faults.filter(f => f.status === FAULT_STATUS.CLOSED).length, [faults]);

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
                    <Typography variant="h4" fontWeight={800} letterSpacing="-0.02em">
                        My Reported Faults
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        View and track all maintenance tickets you have reported.
                    </Typography>
                </Box>
                {/* Dropped on phone: the bottom nav bar's center FAB already
                    reports a fault from any page at that width. */}
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() => setCreateDialogOpen(true)}
                    sx={{
                        fontWeight: 700,
                        px: 2.5,
                        minHeight: 42,
                        width: { xs: '100%', sm: 'auto' },
                        display: { xs: 'none', sm: 'inline-flex' },
                    }}
                >
                    Report a Fault
                </Button>
            </Box>

            {/* Filter and Search Bar */}
            <Paper
                variant="outlined"
                sx={{
                    p: 2,
                    mb: 3,
                    borderRadius: 3,
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    justifyContent: 'space-between',
                    alignItems: { xs: 'stretch', md: 'center' },
                    gap: 2,
                }}
            >
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip
                        label={`All (${faults.length})`}
                        onClick={() => setStatusFilter('all')}
                        color={statusFilter === 'all' ? 'primary' : 'default'}
                        variant={statusFilter === 'all' ? 'filled' : 'outlined'}
                        sx={{ fontWeight: 700 }}
                    />
                    <Chip
                        label={`Open (${openCount})`}
                        onClick={() => setStatusFilter(FAULT_STATUS.OPEN)}
                        color="error"
                        variant={statusFilter === FAULT_STATUS.OPEN ? 'filled' : 'outlined'}
                        sx={{ fontWeight: 700 }}
                    />
                    <Chip
                        label={`Resolved (${resolvedCount})`}
                        onClick={() => setStatusFilter(FAULT_STATUS.CLOSED)}
                        color="success"
                        variant={statusFilter === FAULT_STATUS.CLOSED ? 'filled' : 'outlined'}
                        sx={{ fontWeight: 700 }}
                    />
                </Box>

                <TextField
                    size="small"
                    placeholder="Search by code, description, equipment..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{ width: { xs: '100%', md: 320 } }}
                    slotProps={{ input: {
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                            </InputAdornment>
                        ),
                    } }}
                />
            </Paper>

            {/* Content List */}
            {loading ? (
                <Box {...skeletonA11yProps('Loading reported faults')}>
                    <CardGridSkeleton count={6} height={180} size={{ xs: 12, sm: 6, lg: 4 }} />
                </Box>
            ) : filteredFaults.length === 0 ? (
                <Paper
                    variant="outlined"
                    sx={{
                        p: { xs: 4, sm: 6 },
                        textAlign: 'center',
                        borderRadius: 3,
                        bgcolor: 'background.paper',
                    }}
                >
                    <Box
                        sx={{
                            width: 64,
                            height: 64,
                            borderRadius: '50%',
                            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mx: 'auto',
                            mb: 2,
                            color: 'text.secondary',
                        }}
                    >
                        {searchQuery || statusFilter !== 'all' ? (
                            <SearchIcon sx={{ fontSize: 32 }} />
                        ) : (
                            <CheckCircleOutlineIcon sx={{ fontSize: 32, color: 'success.main' }} />
                        )}
                    </Box>
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                        {searchQuery || statusFilter !== 'all' ? 'No matching reports found' : 'No reported faults'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420, mx: 'auto', mb: 3 }}>
                        {searchQuery || statusFilter !== 'all'
                            ? 'Try adjusting your search query or status filter to see other reports.'
                            : 'You have not reported any equipment issues yet. Keep machines running safely by reporting issues promptly.'}
                    </Typography>
                    {searchQuery || statusFilter !== 'all' ? (
                        <Button
                            variant="outlined"
                            onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                        >
                            Clear Filters
                        </Button>
                    ) : (
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<AddIcon />}
                            onClick={() => setCreateDialogOpen(true)}
                            sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
                        >
                            Report a Fault
                        </Button>
                    )}
                </Paper>
            ) : (
                <Grid container spacing={2}>
                    {filteredFaults.map(fault => (
                        <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={fault._id}>
                            <FaultCard
                                fault={fault}
                                onClick={(f) => setSelectedFault(f)}
                            />
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Modals */}
            <FaultDetailsDialog
                open={Boolean(selectedFault)}
                fault={selectedFault}
                onClose={() => setSelectedFault(null)}
            />

            <CreateFaultDialog
                open={createDialogOpen}
                onClose={() => setCreateDialogOpen(false)}
                onSubmit={handleCreateFault}
            />
        </Container>
    );
}
