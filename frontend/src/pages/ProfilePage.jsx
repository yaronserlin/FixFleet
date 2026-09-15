// src/pages/ProfilePage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
    Container,
    Typography,
    Box,
    Card,
    CardContent,
    Alert,
    Avatar,
    Chip,
    Button,
    Paper,
    Grid,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HistoryIcon from '@mui/icons-material/History';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SpeedIcon from '@mui/icons-material/Speed';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import faultService from '../services/faultsService';
import { getMediaUrl } from '../utils/mediaUtils';
import { formatUserName, getUserInitials } from '../utils/formatUtils';
import LoadingComponent from '../components/LoadingComponent/LoadingComponent';
import { ROUTES, equipmentDetailRoute } from '../constants/routes';
import { DEFAULT_ROLE } from '../constants/roles';
import { FAULT_STATUS } from '../constants/faultStatus';

const ROLE_COLOR = { admin: 'error', mechanic: 'primary', operator: 'success' };
const ROLE_BORDER = { admin: '#DC2626', mechanic: '#2563EB', operator: '#16A34A' };

export default function ProfilePage() {
    const { user, userId } = useAuth();
    const navigate = useNavigate();
    const [faults, setFaults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');

    const effectiveUserId = userId || user?.id || user?._id;

    useEffect(() => {
        async function loadFaults() {
            try {
                const all = await faultService.getAll();
                const mine = all.filter(f => {
                    const op = f.operator && (f.operator._id || f.operator);
                    return op === effectiveUserId;
                });
                const sorted = mine.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                setFaults(sorted);
            } catch (err) {
                console.error(err);
                setError('Failed to load your reported faults');
            } finally {
                setLoading(false);
            }
        }
        if (effectiveUserId) {
            loadFaults();
        } else {
            setLoading(false);
        }
    }, [effectiveUserId]);

    const filteredFaults = useMemo(() => {
        if (statusFilter === 'all') return faults;
        return faults.filter(f => f.status === statusFilter);
    }, [faults, statusFilter]);

    if (loading) return <LoadingComponent message="Loading profile and activity..." />;

    if (error) {
        return (
            <Container sx={{ mt: 4 }}>
                <Alert severity="error">{error}</Alert>
            </Container>
        );
    }

    const openCount = faults.filter(f => f.status === FAULT_STATUS.OPEN).length;
    const closedCount = faults.filter(f => f.status === FAULT_STATUS.CLOSED).length;
    const avatarSrc = getMediaUrl(user?.avatar || user?.avatarUrl);
    const userRole = user?.role || DEFAULT_ROLE;
    const roleThemeColor = ROLE_COLOR[userRole] || 'primary';
    const roleBorderColor = ROLE_BORDER[userRole] || '#2563EB';

    return (
        <Container sx={{ mt: 3, mb: 6 }}>
            {/* User Profile Summary Header */}
            <Paper
                variant="outlined"
                sx={{
                    p: { xs: 2.5, sm: 3 },
                    borderRadius: 3,
                    mb: 4,
                    borderLeft: `4px solid ${roleBorderColor}`,
                }}
            >
                <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                    <Box display="flex" alignItems="center" gap={2.5}>
                        <Avatar
                            src={avatarSrc}
                            alt={formatUserName(user?.name) || 'User'}
                            sx={{
                                width: 72,
                                height: 72,
                                bgcolor: `${roleThemeColor}.main`,
                                color: '#FFFFFF',
                                fontSize: '1.75rem',
                                fontWeight: 800,
                            }}
                        >
                            {getUserInitials(user?.name)}
                        </Avatar>
                        <Box>
                            <Box display="flex" alignItems="center" gap={1.25} mb={0.5}>
                                <Typography variant="h5" fontWeight={800} letterSpacing="-0.02em">
                                    {formatUserName(user?.name) || 'User'}
                                </Typography>
                                <Chip
                                    label={userRole.toUpperCase()}
                                    color={roleThemeColor}
                                    size="small"
                                    sx={{ fontWeight: 700, height: 22, fontSize: '0.7rem' }}
                                />
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                                {user?.email}
                            </Typography>
                        </Box>
                    </Box>

                    <Button
                        variant="outlined"
                        color="primary"
                        startIcon={<ManageAccountsIcon />}
                        onClick={() => navigate(ROUTES.ACCOUNT)}
                        sx={{ minHeight: 40 }}
                    >
                        Edit Account Details
                    </Button>
                </Box>

                {/* Stat pills */}
                <Box display="flex" gap={1} mt={2.5} pt={2} borderTop="1px solid" borderColor="divider" flexWrap="wrap">
                    <Chip
                        size="small"
                        label={`${faults.length} Reported`}
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                    />
                    <Chip
                        size="small"
                        label={`${openCount} Open`}
                        color="error"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                    />
                    <Chip
                        size="small"
                        label={`${closedCount} Resolved`}
                        color="success"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                    />
                </Box>
            </Paper>

            {/* Reported Faults Section Header & Stats */}
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={2.5}>
                <Box display="flex" alignItems="center" gap={1}>
                    <HistoryIcon color="primary" />
                    <Typography variant="h5" fontWeight={800} letterSpacing="-0.01em">
                        My Reported Activity
                    </Typography>
                </Box>

                <Box display="flex" gap={0.75} flexWrap="wrap">
                    <Chip
                        label={`All (${faults.length})`}
                        size="small"
                        variant={statusFilter === 'all' ? 'filled' : 'outlined'}
                        color={statusFilter === 'all' ? 'primary' : 'default'}
                        onClick={() => setStatusFilter('all')}
                        sx={{ fontWeight: 600, cursor: 'pointer' }}
                    />
                    <Chip
                        label={`Open (${openCount})`}
                        size="small"
                        variant={statusFilter === FAULT_STATUS.OPEN ? 'filled' : 'outlined'}
                        color={statusFilter === FAULT_STATUS.OPEN ? 'error' : 'default'}
                        onClick={() => setStatusFilter(FAULT_STATUS.OPEN)}
                        sx={{ fontWeight: 600, cursor: 'pointer' }}
                    />
                    <Chip
                        label={`Closed (${closedCount})`}
                        size="small"
                        variant={statusFilter === FAULT_STATUS.CLOSED ? 'filled' : 'outlined'}
                        color={statusFilter === FAULT_STATUS.CLOSED ? 'success' : 'default'}
                        onClick={() => setStatusFilter(FAULT_STATUS.CLOSED)}
                        sx={{ fontWeight: 600, cursor: 'pointer' }}
                    />
                </Box>
            </Box>

            {filteredFaults.length === 0 ? (
                <Paper
                    variant="outlined"
                    sx={{ p: 5, textAlign: 'center', bgcolor: 'background.paper', borderRadius: 3 }}
                >
                    <CheckCircleIcon sx={{ fontSize: 52, color: 'success.main', mb: 1.5, opacity: 0.8 }} />
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                        {statusFilter !== 'all' ? 'No matching tickets' : 'No activity logged yet'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {statusFilter !== 'all'
                            ? 'Try switching to a different status filter.'
                            : 'When you report equipment faults or incidents, they will appear here.'}
                    </Typography>
                </Paper>
            ) : (
                <Grid container spacing={2}>
                    {filteredFaults.map(fault => {
                        const toolId = fault.tool?._id || fault.tool;
                        const toolName = fault.tool?.name;
                        const isOpen = fault.status === FAULT_STATUS.OPEN;

                        return (
                            <Grid size={{ xs: 12, sm: 6 }} key={fault._id}>
                                <Card
                                    sx={{
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        borderLeft: `4px solid ${isOpen ? '#DC2626' : '#16A34A'}`,
                                        borderRadius: '12px',
                                        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                        '&:hover': {
                                            transform: 'translateY(-2px)',
                                            boxShadow: (theme) => theme.palette.mode === 'dark'
                                                ? '0 6px 16px rgba(0,0,0,0.5)'
                                                : '0 6px 16px rgba(0,0,0,0.08)',
                                        },
                                    }}
                                >
                                    <CardContent sx={{ p: 2.5, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1.5} mb={1}>
                                            <Box>
                                                <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
                                                    {fault.code || 'Fault'}
                                                </Typography>
                                                {toolName && (
                                                    <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mt: 0.25 }}>
                                                        Equipment: {toolName}
                                                    </Typography>
                                                )}
                                            </Box>
                                            <Chip
                                                icon={isOpen ? <WarningAmberIcon sx={{ fontSize: '0.9rem !important' }} /> : <CheckCircleIcon sx={{ fontSize: '0.9rem !important' }} />}
                                                label={isOpen ? 'Open' : 'Closed'}
                                                size="small"
                                                color={isOpen ? 'error' : 'success'}
                                                sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                                            />
                                        </Box>

                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{
                                                mb: 2,
                                                flexGrow: 1,
                                                lineHeight: 1.45,
                                                display: '-webkit-box',
                                                WebkitLineClamp: 3,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                            }}
                                        >
                                            {fault.description}
                                        </Typography>

                                        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} pt={1} borderTop="1px solid" borderColor="divider">
                                            {fault.engineHours !== undefined ? (
                                                <Chip
                                                    icon={<SpeedIcon sx={{ fontSize: '0.9rem !important' }} />}
                                                    label={`${fault.engineHours} hrs`}
                                                    size="small"
                                                    variant="outlined"
                                                    color="primary"
                                                    sx={{ height: 22, fontSize: '0.72rem', fontWeight: 600 }}
                                                />
                                            ) : <Box />}

                                            <Box display="flex" alignItems="center" gap={1}>
                                                <Typography variant="caption" color="text.secondary">
                                                    {new Date(fault.createdAt).toLocaleDateString('en-GB')}
                                                </Typography>
                                                {toolId && (
                                                    <Button
                                                        size="small"
                                                        variant="text"
                                                        color="primary"
                                                        endIcon={<ChevronRightIcon />}
                                                        onClick={() => navigate(equipmentDetailRoute(toolId))}
                                                        sx={{ fontWeight: 700, p: '2px 6px', minHeight: 28 }}
                                                    >
                                                        Details
                                                    </Button>
                                                )}
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        );
                    })}
                </Grid>
            )}
        </Container>
    );
}