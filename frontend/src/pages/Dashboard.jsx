// src/pages/Dashboard.jsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    Container,
    Grid,
    Typography,
    Card,
    CardContent,
    Box,
    Button,
    TextField,
    InputAdornment,
    Chip,
    Paper,
    Skeleton,
    useTheme,
    alpha,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BugReportIcon from '@mui/icons-material/BugReport';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import SpeedIcon from '@mui/icons-material/Speed';
import { useNavigate } from 'react-router-dom';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip as ChartTooltip,
    CartesianGrid,
    Legend,
} from 'recharts';

import { useAuth } from '../contexts/AuthContext';
import { useNotify } from '../contexts/NotificationContext';
import { useEquipment } from '../contexts/EquipmentContext';
import { useFault } from '../contexts/FaultContext';
import { formatUserName } from '../utils/formatUtils';
import { ROUTES } from '../constants/routes';
import { ROLES } from '../constants/roles';
import { FAULT_STATUS } from '../constants/faultStatus';
import equipmentService from '../services/equipmentService';
import faultService from '../services/faultsService';
import FaultModal from '../components/Fault/FaultModal/FaultModal';
import FaultCard from '../components/Fault/FaultCard/FaultCard';
import CloseFaultDialog from '../components/Fault/CloseFaultDialog/CloseFaultDialog';
import CreateFaultDialog from '../components/Fault/CreateFaultDialog/CreateFaultDialog';
import ConfirmDialog from '../components/ConfirmDialog/ConfirmDialog';
import { usePageRefresh } from '../contexts/PageRefreshContext';
import {
    PageHeaderSkeleton,
    KpiCardsSkeleton,
    ChartCardSkeleton,
    FilterBarSkeleton,
    CardGridSkeleton,
} from '../components/Skeletons/Skeletons';
import { skeletonA11yProps } from '../components/Skeletons/skeletonA11y';

// ─── Skeleton loading states ─────────────────────────────────────────────────
// Each mirrors the view it stands in for, down to the narrow-screen rules
// below (the KPI row and the operator hero are phone-hidden in both).
function DashboardSkeleton({ isOperator = false }) {
    if (isOperator) {
        return (
            <Container maxWidth="md" sx={{ mt: 3, mb: 6 }} {...skeletonA11yProps('Loading dashboard')}>
                <Skeleton
                    variant="rounded"
                    height={320}
                    sx={{ borderRadius: 3, mb: 4, display: { xs: 'none', sm: 'block' } }}
                />
                <PageHeaderSkeleton actions={[{ display: { xs: 'none', sm: 'block' } }]} />
                <CardGridSkeleton count={4} height={170} size={{ xs: 12, sm: 6 }} sx={{ mb: 4 }} />
                <CardGridSkeleton count={2} height={150} size={{ xs: 12, sm: 6 }} />
            </Container>
        );
    }

    return (
        <Container maxWidth="xl" sx={{ mt: 3, mb: 6 }} {...skeletonA11yProps('Loading dashboard')}>
            <PageHeaderSkeleton actions={[{}, { display: { xs: 'none', sm: 'block' } }]} />
            <KpiCardsSkeleton display={{ xs: 'none', sm: 'flex' }} />
            <ChartCardSkeleton />
            <FilterBarSkeleton />
            <CardGridSkeleton count={6} height={180} />
        </Container>
    );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, caption, accentColor, icon, iconBg }) {
    return (
        <Card
            sx={{
                borderTop: `4px solid ${accentColor}`,
                borderRadius: '12px',
                '&:hover': { transform: 'translateY(-3px)' },
            }}
        >
            <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Typography
                        variant="overline"
                        sx={{ fontWeight: 700, fontSize: '0.65rem', letterSpacing: '0.08em', color: 'text.secondary' }}
                    >
                        {label}
                    </Typography>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 36,
                            height: 36,
                            borderRadius: 2,
                            bgcolor: iconBg,
                            color: accentColor,
                            flexShrink: 0,
                        }}
                    >
                        {icon}
                    </Box>
                </Box>
                <Typography
                    variant="h3"
                    fontWeight={800}
                    letterSpacing="-0.025em"
                    sx={{ color: accentColor === '#2563EB' ? 'text.primary' : accentColor, mb: 0.5 }}
                >
                    {value}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                    {caption}
                </Typography>
            </CardContent>
        </Card>
    );
}

// ─── Filter bar ──────────────────────────────────────────────────────────────
function FilterBar({ total, openCount, closedCount, statusFilter, setStatusFilter, searchQuery, setSearchQuery, placeholder }) {
    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', sm: 'center' },
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 1.5,
                mb: 2.5,
            }}
        >
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                {[
                    { value: 'all',    label: `All (${total})`,         color: 'default' },
                    { value: FAULT_STATUS.OPEN,   label: `Open (${openCount})`,    color: 'error'   },
                    { value: FAULT_STATUS.CLOSED, label: `Closed (${closedCount})`,color: 'success' },
                ].map(opt => (
                    <Chip
                        key={opt.value}
                        label={opt.label}
                        size="small"
                        variant={statusFilter === opt.value ? 'filled' : 'outlined'}
                        color={statusFilter === opt.value ? opt.color : 'default'}
                        onClick={() => setStatusFilter(opt.value)}
                        sx={{ fontWeight: 600, cursor: 'pointer' }}
                    />
                ))}
            </Box>

            <TextField
                size="small"
                placeholder={placeholder || 'Search faults...'}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                    ),
                }}
                sx={{ width: { xs: '100%', sm: 220 } }}
            />
        </Box>
    );
}

// ─── Empty state ─────────────────────────────────────────────────────────────
function FaultEmptyState({ hasFilters, onClear }) {
    return (
        <Paper
            variant="outlined"
            sx={{ p: { xs: 4, sm: 6 }, textAlign: 'center', borderRadius: 3 }}
        >
            <CheckCircleIcon sx={{ fontSize: 52, color: 'success.main', mb: 1.5, opacity: 0.8 }} />
            <Typography variant="h6" fontWeight={700} gutterBottom>
                {hasFilters ? 'No matching faults found' : 'No faults reported yet'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: hasFilters ? 2 : 0 }}>
                {hasFilters
                    ? 'Try clearing your filters or search query.'
                    : 'All equipment is currently running with no reported incidents.'
                }
            </Typography>
            {hasFilters && (
                <Button size="small" variant="outlined" onClick={onClear} sx={{ mt: 0.5 }}>
                    Clear filters
                </Button>
            )}
        </Paper>
    );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function Dashboard() {
    const theme  = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const navigate = useNavigate();
    const { user } = useAuth();
    const notify = useNotify();
    const { fetchEquipment } = useEquipment();
    const { fetchFaults } = useFault();

    const [stats, setStats]           = useState({ total: 0, open: 0, closed: 0, fleetTotal: 0, fleetOperational: 0 });
    const [allFaultsList, setAllFaultsList] = useState([]);
    const [loading, setLoading]       = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchQuery, setSearchQuery]   = useState('');
    const [selectedFault, setSelectedFault]   = useState(null);
    const [closeDialogOpen, setCloseDialogOpen] = useState(false);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [faultToClose, setFaultToClose] = useState(null);
    const [faultToDelete, setFaultToDelete] = useState(null);

    const fetchData = useCallback(async () => {
        if (!user || user.mustChangePassword) return;
        try {
            const [faultsData, equipmentRes] = await Promise.all([
                faultService.getAll(),
                equipmentService.getAll().catch(() => []),
            ]);
            const equipmentData = Array.isArray(equipmentRes) ? equipmentRes : [];

            const total  = faultsData.length;
            const open   = faultsData.filter(f => f.status === FAULT_STATUS.OPEN).length;
            const closed = faultsData.filter(f => f.status === FAULT_STATUS.CLOSED).length;

            const equipmentWithFaults = new Set(
                faultsData.filter(f => f.status === FAULT_STATUS.OPEN).map(f => f.tool?._id || f.tool).filter(Boolean)
            );
            const fleetTotal       = equipmentData.length;
            const fleetOperational = Math.max(0, fleetTotal - equipmentWithFaults.size);

            setStats({ total, open, closed, fleetTotal, fleetOperational });
            setAllFaultsList(faultsData);
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
            notify.error('Failed to refresh dashboard data');
        } finally {
            setLoading(false);
        }
    }, [notify, user]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Pull down anywhere on this page to re-fetch (the gesture + indicator
    // itself lives once in AppLayout -- see contexts/PageRefreshContext).
    usePageRefresh(fetchData);

    // 14-day chart data
    const chartData = useMemo(() => {
        const days = 14;
        const result = [];
        const now = new Date();
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().slice(0, 10);
            const label   = d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
            result.push({
                date:     label,
                Reported: allFaultsList.filter(f => f.createdAt?.slice(0, 10) === dateStr).length,
                Resolved: allFaultsList.filter(f => f.status === FAULT_STATUS.CLOSED && f.closedAt?.slice(0, 10) === dateStr).length,
            });
        }
        return result;
    }, [allFaultsList]);

    const isOperator = user?.role === ROLES.OPERATOR;

    const operatorFaults = useMemo(() => {
        const uid = user?.id || user?._id;
        return allFaultsList.filter(f => (f.operator?._id || f.operator) === uid);
    }, [allFaultsList, user]);

    const activeFaultsList = isOperator ? operatorFaults : allFaultsList;

    const filteredFaults = useMemo(() => {
        const sorted = [...activeFaultsList].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
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
    }, [activeFaultsList, statusFilter, searchQuery]);

    const handleCreateFault = async (values) => {
        if (!values?.tool) {
            notify.error('Please select an equipment to report a fault for');
            return;
        }
        try {
            await faultService.create({ ...values, operator: user?.id || user?._id });
            notify.success('Fault reported successfully');
            setCreateDialogOpen(false);
            await Promise.all([
                fetchData(),
                fetchEquipment ? fetchEquipment() : Promise.resolve(),
                fetchFaults ? fetchFaults() : Promise.resolve(),
            ]);
        } catch (err) {
            notify.error(err.response?.data?.message || 'Failed to report fault');
        }
    };

    const handleConfirmCloseFault = async (fault, closeData) => {
        try {
            const payload = typeof closeData === 'object' && closeData !== null
                ? closeData
                : { engineHours: closeData };
            await faultService.close(fault._id, payload);
            setCloseDialogOpen(false);
            setFaultToClose(null);
            notify.success('Fault marked as resolved');
            await Promise.all([
                fetchData(),
                fetchEquipment ? fetchEquipment() : Promise.resolve(),
                fetchFaults ? fetchFaults() : Promise.resolve(),
            ]);
        } catch (err) {
            notify.error(err.response?.data?.message || 'Failed to close fault');
        }
    };

    const handleReopenFault = async (fault) => {
        try {
            await faultService.reopen(fault._id);
            notify.success('Fault reopened');
            await Promise.all([
                fetchData(),
                fetchEquipment ? fetchEquipment() : Promise.resolve(),
                fetchFaults ? fetchFaults() : Promise.resolve(),
            ]);
        } catch (err) {
            notify.error(err.response?.data?.message || 'Failed to reopen fault');
        }
    };

    const handleDeletePrompt = (fault) => {
        setFaultToDelete(fault);
    };

    const handleConfirmDeleteFault = async () => {
        if (!faultToDelete) return;
        try {
            await faultService.delete(faultToDelete._id);
            notify.success('Fault deleted');
            setFaultToDelete(null);
            setSelectedFault(null);
            await Promise.all([
                fetchData(),
                fetchEquipment ? fetchEquipment() : Promise.resolve(),
                fetchFaults ? fetchFaults() : Promise.resolve(),
            ]);
        } catch (err) {
            notify.error(err.response?.data?.message || 'Failed to delete fault');
            setFaultToDelete(null);
        }
    };

    if (loading) return <DashboardSkeleton isOperator={isOperator} />;

    const operationalRate = stats.fleetTotal > 0
        ? Math.round((stats.fleetOperational / stats.fleetTotal) * 100)
        : 100;

    const hasFilters = statusFilter !== 'all' || searchQuery.trim();

    // ─── OPERATOR VIEW ───────────────────────────────────────────────────────
    // ─── OPERATOR VIEW ───────────────────────────────────────────────────────
    if (isOperator) {
        const recentFaults = [...operatorFaults]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 4);

        return (
            <Container maxWidth="md" sx={{ mt: 3, mb: 6 }}>
                {/* Centered Hero CTA -- hidden on phone: the whole block exists to
                    host one "Report a Fault" button, and at that width the
                    bottom nav bar already carries a permanent center FAB for
                    exactly that. Dropping it puts the operator's own reports
                    at the top of their phone dashboard instead. */}
                <Paper
                    variant="outlined"
                    sx={{
                        p: { xs: 3, sm: 5 },
                        mb: 4,
                        borderRadius: 3,
                        textAlign: 'center',
                        display: { xs: 'none', sm: 'flex' },
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderLeft: '5px solid #2563EB',
                        bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(37,99,235,0.06)' : 'rgba(37,99,235,0.03)',
                    }}
                >
                    <Box
                        sx={{
                            width: 64,
                            height: 64,
                            borderRadius: '50%',
                            bgcolor: 'primary.main',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 2,
                            boxShadow: '0 8px 16px rgba(37,99,235,0.25)',
                        }}
                    >
                        <BugReportIcon sx={{ fontSize: 36 }} />
                    </Box>
                    <Typography variant="h4" fontWeight={800} gutterBottom letterSpacing="-0.02em">
                        Need to Report an Issue?
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 520, mb: 3.5 }}>
                        Report equipment malfunctions, leaks, or maintenance alerts so our technical team can inspect and resolve them.
                    </Typography>
                    <Button
                        variant="contained"
                        color="primary"
                        size="large"
                        startIcon={<AddIcon />}
                        onClick={() => setCreateDialogOpen(true)}
                        sx={{
                            py: 1.5,
                            px: 4,
                            fontSize: '1rem',
                            fontWeight: 700,
                            borderRadius: 2,
                            boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
                        }}
                    >
                        Report a Fault Now
                    </Button>
                </Paper>

                {/* Recent Reports Preview */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
                    <Box>
                        <Typography variant="h6" fontWeight={700}>
                            Recent Reports Preview
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Your latest logged tickets
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Button
                            variant="contained"
                            color="primary"
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={() => setCreateDialogOpen(true)}
                            sx={{ fontWeight: 700, display: { xs: 'none', sm: 'inline-flex' } }}
                        >
                            Report Fault
                        </Button>
                        {operatorFaults.length > 0 && (
                            <Button
                                variant="text"
                                color="primary"
                                onClick={() => navigate(ROUTES.MY_REPORTS)}
                                sx={{ fontWeight: 700 }}
                            >
                                View All ({operatorFaults.length}) →
                            </Button>
                        )}
                    </Box>
                </Box>

                {recentFaults.length === 0 ? (
                    <Paper
                        variant="outlined"
                        sx={{ p: 4, textAlign: 'center', borderRadius: 3, mb: 4 }}
                    >
                        <CheckCircleIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
                        <Typography variant="subtitle1" fontWeight={700}>
                            No faults reported
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            You currently have no active or historical tickets recorded.
                        </Typography>
                    </Paper>
                ) : (
                    <Grid container spacing={2} sx={{ mb: 4 }}>
                        {recentFaults.map(fault => (
                            <Grid size={{ xs: 12, sm: 6 }} key={fault._id}>
                                <FaultCard fault={fault} onClick={f => setSelectedFault(f)} />
                            </Grid>
                        ))}
                    </Grid>
                )}

                {/* Secondary Quick Access Cards */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Paper
                            variant="outlined"
                            sx={{
                                p: 2.5,
                                borderRadius: 3,
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                borderLeft: '4px solid #2563EB',
                            }}
                        >
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle1" fontWeight={700}>
                                    Equipment Manuals
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Browse operating books and manufacturer documentation for all machines.
                                </Typography>
                            </Box>
                            <Button
                                variant="outlined"
                                color="primary"
                                onClick={() => navigate(ROUTES.MANUALS)}
                                sx={{ alignSelf: 'flex-start', fontWeight: 600 }}
                            >
                                Browse Manuals →
                            </Button>
                        </Paper>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Paper
                            variant="outlined"
                            sx={{
                                p: 2.5,
                                borderRadius: 3,
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                borderLeft: '4px solid #475569',
                            }}
                        >
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle1" fontWeight={700}>
                                    Account Settings
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Update your personal details, profile picture, or password.
                                </Typography>
                            </Box>
                            <Button
                                variant="outlined"
                                onClick={() => navigate(ROUTES.ACCOUNT)}
                                sx={{ alignSelf: 'flex-start', fontWeight: 600 }}
                            >
                                Manage Account →
                            </Button>
                        </Paper>
                    </Grid>
                </Grid>

                {/* Dialogs */}
                {selectedFault && (
                    <FaultModal fault={selectedFault} handleClose={() => setSelectedFault(null)} open={Boolean(selectedFault)} />
                )}
                <CreateFaultDialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} onSubmit={handleCreateFault} />
            </Container>
        );
    }

    // ─── TECHNICIAN / ADMIN VIEW ─────────────────────────────────────────────
    return (
        <Container maxWidth="xl" sx={{ mt: 3, mb: 6 }}>
            {/* Welcome Header */}
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
                        Welcome back, {formatUserName(user?.name) || 'Technician'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Operations & Equipment Maintenance Dashboard
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                    <Button
                        variant="outlined"
                        startIcon={<PrecisionManufacturingIcon />}
                        onClick={() => navigate(ROUTES.EQUIPMENT)}
                        sx={{ minHeight: 44 }}
                    >
                        Browse Equipment
                    </Button>
                    {/* Phone widths already carry a permanent "report fault"
                        FAB in the center of the bottom nav bar, so this
                        duplicate is dropped there. */}
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setCreateDialogOpen(true)}
                        sx={{ minHeight: 44, fontWeight: 700, display: { xs: 'none', sm: 'inline-flex' } }}
                    >
                        Report Fault
                    </Button>
                </Box>
            </Box>

            {/* KPI Cards -- hidden on phone: at that width the four stat cards
                push the trend chart and the fault list (what a technician
                actually acts on) below the fold, so narrow screens go
                straight to chart + faults. */}
            <Grid container spacing={2} sx={{ mb: 4, display: { xs: 'none', sm: 'flex' } }}>
                {[
                    {
                        label: 'TOTAL REPORTED',
                        value: stats.total,
                        caption: 'All logged maintenance incidents',
                        accentColor: '#2563EB',
                        icon: <BugReportIcon sx={{ fontSize: 18 }} />,
                        iconBg: alpha('#2563EB', isDark ? 0.2 : 0.1),
                    },
                    {
                        label: 'ACTIVE FAULTS',
                        value: stats.open,
                        caption: 'Requiring mechanic attention',
                        accentColor: '#DC2626',
                        icon: <WarningAmberIcon sx={{ fontSize: 18 }} />,
                        iconBg: alpha('#DC2626', isDark ? 0.2 : 0.1),
                    },
                    {
                        label: 'RESOLVED',
                        value: stats.closed,
                        caption: 'Closed with engine hours logged',
                        accentColor: '#16A34A',
                        icon: <CheckCircleIcon sx={{ fontSize: 18 }} />,
                        iconBg: alpha('#16A34A', isDark ? 0.2 : 0.1),
                    },
                    {
                        label: 'FLEET AVAILABILITY',
                        value: `${operationalRate}%`,
                        caption: `${stats.fleetOperational} of ${stats.fleetTotal} machines operational`,
                        accentColor: '#0891B2',
                        icon: <SpeedIcon sx={{ fontSize: 18 }} />,
                        iconBg: alpha('#0891B2', isDark ? 0.2 : 0.1),
                    },
                ].map(k => (
                    <Grid size={{ xs: 12, sm: 6, md: 3 }} key={k.label}>
                        <KpiCard {...k} />
                    </Grid>
                ))}
            </Grid>

            {/* 14-Day Activity Chart */}
            <Card sx={{ mb: 4, borderRadius: 3 }}>
                <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1, mb: 2.5 }}>
                        <Box>
                            <Typography variant="subtitle1" fontWeight={700}>
                                14-Day Maintenance Trend
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Daily breakdown of reported faults vs resolved tickets
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#DC2626' }} />
                                <Typography variant="caption" color="text.secondary" fontWeight={500}>Reported</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#16A34A' }} />
                                <Typography variant="caption" color="text.secondary" fontWeight={500}>Resolved</Typography>
                            </Box>
                        </Box>
                    </Box>

                    <Box sx={{ width: '100%', height: { xs: 160, sm: 220 } }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="gradReported" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%"  stopColor="#DC2626" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#DC2626" stopOpacity={0}   />
                                    </linearGradient>
                                    <linearGradient id="gradResolved" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%"  stopColor="#16A34A" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#16A34A" stopOpacity={0}   />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
                                    vertical={false}
                                />
                                <XAxis
                                    dataKey="date"
                                    stroke={isDark ? '#64748B' : '#94A3B8'}
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: isDark ? '#64748B' : '#94A3B8' }}
                                />
                                <YAxis
                                    allowDecimals={false}
                                    stroke={isDark ? '#64748B' : '#94A3B8'}
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: isDark ? '#64748B' : '#94A3B8' }}
                                />
                                <ChartTooltip
                                    contentStyle={{
                                        backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                                        borderColor:     isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                                        borderRadius:    '10px',
                                        fontSize:        '0.8rem',
                                        fontWeight:      500,
                                        boxShadow:       '0 4px 16px rgba(0,0,0,0.12)',
                                        border:          `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                                    }}
                                    cursor={{ stroke: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', strokeWidth: 1 }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="Reported"
                                    stroke="#DC2626"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#gradReported)"
                                    dot={false}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="Resolved"
                                    stroke="#16A34A"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#gradResolved)"
                                    dot={false}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Box>
                </CardContent>
            </Card>

            {/* Recent Faults Section */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
                <Typography variant="h6" fontWeight={700}>Recent Fault Reports</Typography>
                <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => setCreateDialogOpen(true)}
                    sx={{ fontWeight: 700, display: { xs: 'none', sm: 'inline-flex' } }}
                >
                    Report Fault
                </Button>
            </Box>

            <FilterBar
                total={allFaultsList.length}
                openCount={stats.open}
                closedCount={stats.closed}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
            />

            {filteredFaults.length === 0 ? (
                <FaultEmptyState
                    hasFilters={hasFilters}
                    onClear={() => { setStatusFilter('all'); setSearchQuery(''); }}
                />
            ) : (
                <Grid container spacing={2}>
                    {filteredFaults.map(fault => (
                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={fault._id}>
                            <FaultCard
                                fault={fault}
                                onClick={f => setSelectedFault(f)}
                                onCloseFault={(f) => { setFaultToClose(f); setCloseDialogOpen(true); }}
                                onReopenFault={handleReopenFault}
                                onDeleteFault={handleDeletePrompt}
                            />
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Dialogs */}
            {selectedFault && (
                <FaultModal
                    fault={selectedFault}
                    handleClose={() => setSelectedFault(null)}
                    open={Boolean(selectedFault)}
                    onCloseFault={(f) => { setFaultToClose(f); setCloseDialogOpen(true); }}
                    onReopenFault={handleReopenFault}
                    onDeleteFault={handleDeletePrompt}
                />
            )}
            <CreateFaultDialog
                open={createDialogOpen}
                onClose={() => setCreateDialogOpen(false)}
                onSubmit={handleCreateFault}
            />
            <CloseFaultDialog
                open={closeDialogOpen}
                onClose={() => { setCloseDialogOpen(false); setFaultToClose(null); }}
                onConfirm={handleConfirmCloseFault}
                fault={faultToClose}
                equipment={faultToClose?.tool}
                tool={faultToClose?.tool}
            />
            <ConfirmDialog
                open={Boolean(faultToDelete)}
                title="Confirm Delete"
                message="Are you sure you want to permanently delete this fault?"
                confirmText="Delete"
                cancelText="Cancel"
                confirmColor="error"
                onConfirm={handleConfirmDeleteFault}
                onCancel={() => setFaultToDelete(null)}
            />
        </Container>
    );
}
