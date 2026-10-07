// src/pages/SuperAdminDashboard.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Container,
    Grid,
    Typography,
    Card,
    CardContent,
    Box,
    Button,
    Chip,
    Paper,
    Tabs,
    Tab,
    TextField,
    InputAdornment,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    TableContainer,
    TablePagination,
    Switch,
    Select,
    MenuItem,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    List,
    ListItemButton,
    ListItem,
    ListItemIcon,
    ListItemText,
    useTheme,
    alpha,
} from '@mui/material';
import PublicIcon from '@mui/icons-material/Public';
import CampaignIcon from '@mui/icons-material/Campaign';
import BusinessIcon from '@mui/icons-material/Business';
import PeopleIcon from '@mui/icons-material/People';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import StorageIcon from '@mui/icons-material/Storage';
import SearchIcon from '@mui/icons-material/Search';
import LockResetIcon from '@mui/icons-material/LockReset';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import BlockIcon from '@mui/icons-material/Block';
import BedtimeIcon from '@mui/icons-material/Bedtime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip as ChartTooltip,
    CartesianGrid,
} from 'recharts';

import superadminService from '../services/superadminService';
import KpiCard from '../components/Dashboard/KpiCard';
import ConfirmDialog from '../components/ConfirmDialog/ConfirmDialog';
import SendAnnouncementDialog from '../components/Notifications/SendAnnouncementDialog';
import {
    PageHeaderSkeleton,
    KpiCardsSkeleton,
    ChartCardSkeleton,
    TableSkeleton,
} from '../components/Skeletons/Skeletons';
import { usePageRefresh } from '../contexts/PageRefreshContext';
import { useNotify } from '../contexts/NotificationContext';
import { ALL_ROLES } from '../constants/roles';
import { AUDIT_ACTION_INFO, describeAudit } from '../constants/audit';

const ROLE_LABEL = { operator: 'Operator', mechanic: 'Mechanic', admin: 'Admin' };

const errorMessage = (err, fallback) => err?.response?.data?.message || fallback;

/** 'YYYY-MM' -> 'Jan 25' */
const monthLabel = (month) =>
    new Date(`${month}-01T00:00:00Z`).toLocaleString(undefined, { month: 'short', year: '2-digit', timeZone: 'UTC' });

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '—');

const formatDateTime = (value) => new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

const DAY_MS = 24 * 60 * 60 * 1000;
/** "Today" / "Yesterday" / "12 days ago" / "Never". */
const lastActive = (value) => {
    if (!value) return 'Never';
    const days = Math.floor((Date.now() - new Date(value).getTime()) / DAY_MS);
    if (days <= 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
};

/** 1536 -> "1.5 KB" */
const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

const RECENT_SIGNUPS = 5;
const RECENT_ACTIVITY = 6;
const TABS = { OVERVIEW: 0, COMPANIES: 1, USERS: 2, AUDIT: 3 };

function useChartColors() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    return {
        isDark,
        axis: isDark ? '#64748B' : '#94A3B8',
        grid: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        tooltip: {
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            borderRadius: '10px',
            fontSize: '0.8rem',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
        },
    };
}

function ChartCard({ title, caption, legend = [], children }) {
    return (
        <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
                    <Box>
                        <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
                        <Typography variant="caption" color="text.secondary">{caption}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        {legend.map(({ label, color }) => (
                            <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color }} />
                                <Typography variant="caption" color="text.secondary" fontWeight={500}>{label}</Typography>
                            </Box>
                        ))}
                    </Box>
                </Box>
                <Box sx={{ width: '100%', height: { xs: 200, sm: 240 }, mt: 2 }}>{children}</Box>
            </CardContent>
        </Card>
    );
}

function ListCard({ title, caption, action, children }) {
    return (
        <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 }, '&:last-child': { pb: { xs: 1, sm: 2 } } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                    <Box>
                        <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
                        <Typography variant="caption" color="text.secondary">{caption}</Typography>
                    </Box>
                    {action}
                </Box>
                <List dense disablePadding sx={{ mt: 1 }}>{children}</List>
            </CardContent>
        </Card>
    );
}

/** Platform health issues: companies that are switched off or have gone quiet. */
function AttentionCard({ attention, activeWindowDays, onNavigate }) {
    const items = [
        {
            key: 'inactive',
            show: attention.inactiveCompanies > 0,
            icon: <BlockIcon color="error" />,
            primary: `${attention.inactiveCompanies} deactivated compan${attention.inactiveCompanies === 1 ? 'y' : 'ies'}`,
            secondary: 'Their users cannot log in',
        },
        {
            key: 'dormant',
            show: attention.dormantCompanies > 0,
            icon: <BedtimeIcon color="warning" />,
            primary: `${attention.dormantCompanies} dormant compan${attention.dormantCompanies === 1 ? 'y' : 'ies'}`,
            secondary: `No sign-ins in ${activeWindowDays} days: ${attention.dormantSample.map(c => c.name).join(', ')}`,
        },
    ].filter(item => item.show);

    return (
        <ListCard title="Needs Attention" caption="Platform health">
            {items.length === 0 && (
                <ListItem disableGutters>
                    <ListItemIcon sx={{ minWidth: 40 }}><CheckCircleIcon color="success" /></ListItemIcon>
                    <ListItemText primary="All clear" secondary="Every company is active and in use" />
                </ListItem>
            )}
            {items.map(item => (
                <ListItemButton key={item.key} onClick={() => onNavigate(TABS.COMPANIES)} sx={{ px: 0, borderRadius: 1 }}>
                    <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.primary} secondary={item.secondary} slotProps={{ primary: { fontWeight: 600 } }} />
                </ListItemButton>
            ))}
        </ListCard>
    );
}

function RecentSignupsCard({ companies, onNavigate }) {
    const recent = useMemo(
        () => [...companies].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, RECENT_SIGNUPS),
        [companies]
    );
    return (
        <ListCard title="Recent Signups" caption="Newest companies on FixFleet">
            {recent.map(co => (
                <ListItemButton key={co._id} onClick={() => onNavigate(TABS.COMPANIES)} sx={{ px: 0, borderRadius: 1 }}>
                    <ListItemText
                        primary={co.name}
                        secondary={`Joined ${formatDate(co.createdAt)} · ${co.userCount} account${co.userCount === 1 ? '' : 's'}`}
                        slotProps={{ primary: { fontWeight: 600 } }}
                    />
                    {!co.isActive && <Chip label="Inactive" size="small" />}
                </ListItemButton>
            ))}
        </ListCard>
    );
}

function RecentActivityCard({ refreshKey, onNavigate }) {
    const [logs, setLogs] = useState(null);

    useEffect(() => {
        let active = true;
        superadminService
            .getAuditLogs({ limit: RECENT_ACTIVITY })
            .then(res => active && setLogs(res.logs))
            .catch(() => active && setLogs([]));
        return () => { active = false; };
    }, [refreshKey]);

    return (
        <ListCard
            title="Recent Activity"
            caption="Latest audit events"
            action={<Button size="small" onClick={() => onNavigate(TABS.AUDIT)}>View all</Button>}
        >
            {logs === null && <TableSkeleton rows={3} columns={1} />}
            {logs?.length === 0 && (
                <ListItem disableGutters><ListItemText primary="No activity yet" /></ListItem>
            )}
            {logs?.map(log => (
                <ListItem key={log._id} disableGutters>
                    <ListItemText
                        primary={describeAudit(log)}
                        secondary={formatDateTime(log.createdAt)}
                        slotProps={{ primary: { fontSize: '0.85rem' } }}
                    />
                </ListItem>
            ))}
        </ListCard>
    );
}

// ─── Overview ────────────────────────────────────────────────────────────────
function OverviewTab({ stats, companies, refreshKey, onNavigate }) {
    const c = useChartColors();
    const { totals } = stats;

    const trend = useMemo(
        () => stats.companiesPerMonth.map((row, i) => ({
            month: monthLabel(row.month),
            'New companies': row.count,
            'New accounts': stats.usersPerMonth[i]?.count || 0,
        })),
        [stats]
    );

    const activeShare = totals.users ? Math.round((totals.activeUsers / totals.users) * 100) : 0;
    const kpis = [
        {
            label: 'COMPANIES',
            value: totals.companies,
            caption: `${totals.activeCompanies} active · ${totals.newCompaniesThisMonth} new this month`,
            accentColor: '#2563EB',
            icon: <BusinessIcon sx={{ fontSize: 18 }} />,
        },
        {
            label: 'ACCOUNTS',
            value: totals.users,
            caption: `${totals.newUsersThisMonth} new this month`,
            accentColor: '#7C3AED',
            icon: <PeopleIcon sx={{ fontSize: 18 }} />,
        },
        {
            label: 'ACTIVE USERS',
            value: totals.activeUsers,
            caption: `${activeShare}% signed in within ${stats.activeWindowDays} days`,
            accentColor: '#16A34A',
            icon: <HowToRegIcon sx={{ fontSize: 18 }} />,
        },
        {
            label: 'STORAGE',
            value: formatBytes(totals.storageBytes),
            caption: `${totals.storedFiles} uploaded file${totals.storedFiles === 1 ? '' : 's'}`,
            accentColor: '#0891B2',
            icon: <StorageIcon sx={{ fontSize: 18 }} />,
        },
    ];

    return (
        <>
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {kpis.map(k => (
                    <Grid size={{ xs: 12, sm: 6, md: 3 }} key={k.label}>
                        <KpiCard {...k} iconBg={alpha(k.accentColor, c.isDark ? 0.2 : 0.1)} />
                    </Grid>
                ))}
            </Grid>

            <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 7 }}>
                    <ChartCard
                        title="Platform Growth"
                        caption="New companies and accounts per month"
                        legend={[{ label: 'New companies', color: '#2563EB' }, { label: 'New accounts', color: '#7C3AED' }]}
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
                                <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: c.axis }} />
                                <YAxis allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} tick={{ fill: c.axis }} />
                                <ChartTooltip contentStyle={c.tooltip} />
                                <Area type="monotone" dataKey="New companies" stroke="#2563EB" strokeWidth={2} fill={alpha('#2563EB', 0.15)} dot={false} />
                                <Area type="monotone" dataKey="New accounts" stroke="#7C3AED" strokeWidth={2} fill={alpha('#7C3AED', 0.1)} dot={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </Grid>
                <Grid size={{ xs: 12, md: 5 }}>
                    <ChartCard title="Largest Companies" caption="Active companies by number of accounts">
                        {stats.largestCompanies.length === 0 ? (
                            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Typography variant="body2" color="text.secondary">No companies yet</Typography>
                            </Box>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.largestCompanies} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={c.grid} horizontal={false} />
                                    <XAxis type="number" allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} tick={{ fill: c.axis }} />
                                    <YAxis type="category" dataKey="name" width={110} fontSize={11} tickLine={false} axisLine={false} tick={{ fill: c.axis }} />
                                    <ChartTooltip contentStyle={c.tooltip} cursor={{ fill: alpha('#7C3AED', 0.06) }} />
                                    <Bar dataKey="users" name="Accounts" fill="#7C3AED" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </ChartCard>
                </Grid>
            </Grid>

            <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid size={{ xs: 12, md: 4 }}>
                    <AttentionCard attention={stats.attention} activeWindowDays={stats.activeWindowDays} onNavigate={onNavigate} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                    <RecentSignupsCard companies={companies} onNavigate={onNavigate} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                    <RecentActivityCard refreshKey={refreshKey} onNavigate={onNavigate} />
                </Grid>
            </Grid>
        </>
    );
}

// ─── Companies ───────────────────────────────────────────────────────────────
function CompanyUsersDialog({ companyId, onClose }) {
    const notify = useNotify();
    const [data, setData] = useState(null);

    useEffect(() => {
        if (!companyId) return undefined;
        let active = true;
        setData(null);
        superadminService
            .getCompany(companyId)
            .then(res => active && setData(res))
            .catch(err => active && notify.error(errorMessage(err, 'Failed to load company')));
        return () => { active = false; };
    }, [companyId, notify]);

    return (
        <Dialog open={Boolean(companyId)} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle fontWeight={700}>{data?.company.name || 'Company'}</DialogTitle>
            <DialogContent dividers>
                {!data ? (
                    <TableSkeleton rows={4} columns={3} />
                ) : (
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Email</TableCell>
                                    <TableCell>Role</TableCell>
                                    <TableCell>Joined</TableCell>
                                    <TableCell>Last active</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {data.users.map(u => (
                                    <TableRow key={u._id}>
                                        <TableCell>{u.name}</TableCell>
                                        <TableCell>{u.email}</TableCell>
                                        <TableCell>{ROLE_LABEL[u.role] || u.role}</TableCell>
                                        <TableCell>{formatDate(u.createdAt)}</TableCell>
                                        <TableCell>{lastActive(u.lastActiveAt)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}

function CompaniesTab({ companies, onToggleActive }) {
    const [search, setSearch] = useState('');
    const [openCompanyId, setOpenCompanyId] = useState(null);
    const [pendingDeactivate, setPendingDeactivate] = useState(null);

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        return q ? companies.filter(co => `${co.name} ${co.slug}`.toLowerCase().includes(q)) : companies;
    }, [companies, search]);

    const handleSwitch = (company) => {
        if (company.isActive) {
            setPendingDeactivate(company);
        } else {
            onToggleActive(company, true);
        }
    };

    return (
        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <Box sx={{ p: 2 }}>
                <TextField
                    size="small"
                    placeholder="Search companies"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
                    sx={{ width: { xs: '100%', sm: 320 } }}
                />
            </Box>
            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Company</TableCell>
                            <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Created</TableCell>
                            <TableCell align="right">Accounts</TableCell>
                            <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Last active</TableCell>
                            <TableCell align="center">Active</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {visible.map(co => (
                            <TableRow key={co._id} hover sx={{ cursor: 'pointer' }} onClick={() => setOpenCompanyId(co._id)}>
                                <TableCell>
                                    <Typography fontWeight={600}>{co.name}</Typography>
                                    <Typography variant="caption" color="text.secondary">{co.slug}</Typography>
                                </TableCell>
                                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{formatDate(co.createdAt)}</TableCell>
                                <TableCell align="right">{co.userCount}</TableCell>
                                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{lastActive(co.lastActiveAt)}</TableCell>
                                <TableCell align="center" onClick={e => e.stopPropagation()}>
                                    <Switch
                                        checked={co.isActive}
                                        onChange={() => handleSwitch(co)}
                                        slotProps={{ input: { 'aria-label': `${co.isActive ? 'Deactivate' : 'Activate'} ${co.name}` } }}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                        {visible.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>No companies found</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <CompanyUsersDialog companyId={openCompanyId} onClose={() => setOpenCompanyId(null)} />
            <ConfirmDialog
                open={Boolean(pendingDeactivate)}
                title="Deactivate company?"
                message={`Everyone at ${pendingDeactivate?.name} will be signed out and unable to log in until the company is reactivated.`}
                confirmText="Deactivate"
                confirmColor="error"
                onConfirm={() => {
                    onToggleActive(pendingDeactivate, false);
                    setPendingDeactivate(null);
                }}
                onCancel={() => setPendingDeactivate(null)}
            />
        </Paper>
    );
}

// ─── Users ───────────────────────────────────────────────────────────────────
function UsersTab({ companies, refreshKey }) {
    const notify = useNotify();
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [companyId, setCompanyId] = useState('');
    const [role, setRole] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [result, setResult] = useState(null);
    const [pendingDelete, setPendingDelete] = useState(null);
    const [pendingReset, setPendingReset] = useState(null);
    const [tempPassword, setTempPassword] = useState(null);
    // Only the latest request may update the table, so a slow response for
    // an older search/page can't overwrite a newer one.
    const latestRequest = useRef(0);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(0);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const load = useCallback(async () => {
        const requestId = ++latestRequest.current;
        try {
            const data = await superadminService.getUsers({
                search: debouncedSearch || undefined,
                companyId: companyId || undefined,
                role: role || undefined,
                page: page + 1,
                limit: rowsPerPage,
            });
            if (requestId === latestRequest.current) setResult(data);
        } catch (err) {
            if (requestId === latestRequest.current) notify.error(errorMessage(err, 'Failed to load users'));
        }
    }, [debouncedSearch, companyId, role, page, rowsPerPage, notify]);

    useEffect(() => { load(); }, [load, refreshKey]);

    const handleRoleChange = async (user, newRole) => {
        try {
            await superadminService.updateUserRole(user._id, newRole);
            notify.success(`${user.name} is now ${ROLE_LABEL[newRole].toLowerCase()}`);
            load();
        } catch (err) {
            notify.error(errorMessage(err, 'Failed to change role'));
        }
    };

    const handleDelete = async () => {
        const user = pendingDelete;
        setPendingDelete(null);
        try {
            await superadminService.deleteUser(user._id);
            notify.success(`${user.name} deleted`);
            load();
        } catch (err) {
            notify.error(errorMessage(err, 'Failed to delete user'));
        }
    };

    const handleReset = async () => {
        const user = pendingReset;
        setPendingReset(null);
        try {
            const { temporaryPassword } = await superadminService.resetUserPassword(user._id);
            setTempPassword({ user, password: temporaryPassword });
        } catch (err) {
            notify.error(errorMessage(err, 'Failed to reset password'));
        }
    };

    const copyTempPassword = async () => {
        try {
            await navigator.clipboard.writeText(tempPassword.password);
            notify.success('Copied');
        } catch {
            notify.error('Copy failed; select the password and copy it manually');
        }
    };

    return (
        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <Box sx={{ p: 2, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <TextField
                    size="small"
                    placeholder="Search name or email"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
                    sx={{ flex: '1 1 220px', maxWidth: { sm: 320 } }}
                />
                <Select
                    size="small"
                    value={companyId}
                    displayEmpty
                    onChange={e => { setCompanyId(e.target.value); setPage(0); }}
                    inputProps={{ 'aria-label': 'Filter by company' }}
                    sx={{ minWidth: 180 }}
                >
                    <MenuItem value="">All companies</MenuItem>
                    {companies.map(co => <MenuItem key={co._id} value={co._id}>{co.name}</MenuItem>)}
                </Select>
                <Select
                    size="small"
                    value={role}
                    displayEmpty
                    onChange={e => { setRole(e.target.value); setPage(0); }}
                    inputProps={{ 'aria-label': 'Filter by role' }}
                    sx={{ minWidth: 140 }}
                >
                    <MenuItem value="">All roles</MenuItem>
                    {ALL_ROLES.map(r => <MenuItem key={r} value={r}>{ROLE_LABEL[r]}</MenuItem>)}
                </Select>
            </Box>

            {!result ? (
                <Box sx={{ p: 2 }}><TableSkeleton rows={6} columns={4} /></Box>
            ) : (
                <>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>User</TableCell>
                                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Company</TableCell>
                                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Last active</TableCell>
                                    <TableCell>Role</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {result.users.map(u => (
                                    <TableRow key={u._id} hover>
                                        <TableCell>
                                            <Typography fontWeight={600}>{u.name}</Typography>
                                            <Typography variant="caption" color="text.secondary">{u.email}</Typography>
                                        </TableCell>
                                        <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                                            {u.companyId?.name || '—'}
                                            {u.companyId && !u.companyId.isActive && (
                                                <Chip label="Inactive" size="small" sx={{ ml: 1 }} />
                                            )}
                                        </TableCell>
                                        <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>{lastActive(u.lastActiveAt)}</TableCell>
                                        <TableCell>
                                            <Select
                                                size="small"
                                                value={u.role}
                                                onChange={e => handleRoleChange(u, e.target.value)}
                                                inputProps={{ 'aria-label': `Role for ${u.name}` }}
                                            >
                                                {ALL_ROLES.map(r => <MenuItem key={r} value={r}>{ROLE_LABEL[r]}</MenuItem>)}
                                            </Select>
                                        </TableCell>
                                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                                            <Tooltip title="Reset password">
                                                <IconButton onClick={() => setPendingReset(u)} aria-label={`Reset password for ${u.name}`}>
                                                    <LockResetIcon />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete user">
                                                <IconButton color="error" onClick={() => setPendingDelete(u)} aria-label={`Delete ${u.name}`}>
                                                    <DeleteIcon />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {result.users.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>No users found</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <TablePagination
                        component="div"
                        count={result.total}
                        page={page}
                        onPageChange={(_, p) => setPage(p)}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                        rowsPerPageOptions={[10, 20, 50, 100]}
                    />
                </>
            )}

            <ConfirmDialog
                open={Boolean(pendingReset)}
                title="Reset password?"
                message={`${pendingReset?.name} will be signed out everywhere and must set a new password after logging in with a temporary one.`}
                confirmText="Reset"
                onConfirm={handleReset}
                onCancel={() => setPendingReset(null)}
            />
            <ConfirmDialog
                open={Boolean(pendingDelete)}
                title="Delete user?"
                message={`This permanently deletes ${pendingDelete?.name} (${pendingDelete?.email}).`}
                confirmText="Delete"
                confirmColor="error"
                onConfirm={handleDelete}
                onCancel={() => setPendingDelete(null)}
            />
            <Dialog open={Boolean(tempPassword)} onClose={() => setTempPassword(null)} maxWidth="xs" fullWidth>
                <DialogTitle fontWeight={700}>Temporary password</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        Share this with {tempPassword?.user.name}. It is shown only once.
                    </Typography>
                    <TextField
                        fullWidth
                        value={tempPassword?.password || ''}
                        slotProps={{
                            htmlInput: { readOnly: true, 'aria-label': 'Temporary password' },
                            input: {
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={copyTempPassword} aria-label="Copy password">
                                            <ContentCopyIcon fontSize="small" />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            },
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTempPassword(null)}>Done</Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
}

// ─── Audit log ───────────────────────────────────────────────────────────────
function AuditTab({ companies, refreshKey }) {
    const notify = useNotify();
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [action, setAction] = useState('');
    const [companyId, setCompanyId] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [result, setResult] = useState(null);
    const latestRequest = useRef(0);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(0);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        const requestId = ++latestRequest.current;
        superadminService
            .getAuditLogs({
                search: debouncedSearch || undefined,
                action: action || undefined,
                companyId: companyId || undefined,
                page: page + 1,
                limit: rowsPerPage,
            })
            .then(data => { if (requestId === latestRequest.current) setResult(data); })
            .catch(err => {
                if (requestId === latestRequest.current) notify.error(errorMessage(err, 'Failed to load audit log'));
            });
    }, [debouncedSearch, action, companyId, page, rowsPerPage, refreshKey, notify]);

    return (
        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <Box sx={{ p: 2, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <TextField
                    size="small"
                    placeholder="Search person, email, or target"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
                    sx={{ flex: '1 1 220px', maxWidth: { sm: 320 } }}
                />
                <Select
                    size="small"
                    value={action}
                    displayEmpty
                    onChange={e => { setAction(e.target.value); setPage(0); }}
                    inputProps={{ 'aria-label': 'Filter by event' }}
                    sx={{ minWidth: 200 }}
                >
                    <MenuItem value="">All events</MenuItem>
                    {Object.entries(AUDIT_ACTION_INFO).map(([value, info]) => (
                        <MenuItem key={value} value={value}>{info.label}</MenuItem>
                    ))}
                </Select>
                <Select
                    size="small"
                    value={companyId}
                    displayEmpty
                    onChange={e => { setCompanyId(e.target.value); setPage(0); }}
                    inputProps={{ 'aria-label': 'Filter audit by company' }}
                    sx={{ minWidth: 180 }}
                >
                    <MenuItem value="">All companies</MenuItem>
                    {companies.map(co => <MenuItem key={co._id} value={co._id}>{co.name}</MenuItem>)}
                </Select>
            </Box>

            {!result ? (
                <Box sx={{ p: 2 }}><TableSkeleton rows={8} columns={3} /></Box>
            ) : (
                <>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>When</TableCell>
                                    <TableCell>Event</TableCell>
                                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Company</TableCell>
                                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>IP address</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {result.logs.map(log => {
                                    const info = AUDIT_ACTION_INFO[log.action] || { label: log.action, color: 'default' };
                                    return (
                                        <TableRow key={log._id} hover>
                                            <TableCell sx={{ whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                                                <Typography variant="body2">{formatDateTime(log.createdAt)}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip label={info.label} color={info.color} size="small" variant="outlined" sx={{ mb: 0.5 }} />
                                                <Typography variant="body2">{describeAudit(log)}</Typography>
                                                {log.actor?.email && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        by {log.actor.email} ({log.actor.role})
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, verticalAlign: 'top' }}>
                                                {log.companyId?.name || '—'}
                                            </TableCell>
                                            <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' }, verticalAlign: 'top', fontFamily: 'monospace' }}>
                                                {log.ip || '—'}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {result.logs.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>No audit events found</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <TablePagination
                        component="div"
                        count={result.total}
                        page={page}
                        onPageChange={(_, p) => setPage(p)}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                        rowsPerPageOptions={[10, 20, 50, 100]}
                    />
                </>
            )}
        </Paper>
    );
}

// ─── Page ────────────────────────────────────────────────────────────────────
/**
 * Platform dashboard for the superadmin: cross-company stats, company
 * activation, user management, and platform-wide announcements.
 */
export default function SuperAdminDashboard() {
    const notify = useNotify();
    const [tab, setTab] = useState(0);
    const [stats, setStats] = useState(null);
    const [companies, setCompanies] = useState(null);
    // Bumped by pull-to-refresh and by actions, so tabs/cards that load their own data reload.
    const [refreshKey, setRefreshKey] = useState(0);
    const [announcementOpen, setAnnouncementOpen] = useState(false);

    const loadStats = useCallback(
        () => superadminService.getStats()
            .then(setStats)
            .catch(err => notify.error(errorMessage(err, 'Failed to load platform stats'))),
        [notify]
    );
    const loadCompanies = useCallback(
        () => superadminService.getCompanies()
            .then(setCompanies)
            .catch(err => notify.error(errorMessage(err, 'Failed to load companies'))),
        [notify]
    );

    useEffect(() => {
        loadStats();
        loadCompanies();
    }, [loadStats, loadCompanies]);

    const handleRefresh = useCallback(async () => {
        setRefreshKey(k => k + 1);
        await Promise.all([loadStats(), loadCompanies()]);
    }, [loadStats, loadCompanies]);
    usePageRefresh(handleRefresh);

    const handleToggleActive = async (company, isActive) => {
        try {
            await superadminService.setCompanyActive(company._id, isActive);
            notify.success(`${company.name} ${isActive ? 'activated' : 'deactivated'}`);
            await Promise.all([loadStats(), loadCompanies()]);
            setRefreshKey(k => k + 1);
        } catch (err) {
            notify.error(errorMessage(err, 'Failed to update company'));
        }
    };

    if (!stats || !companies) {
        return (
            <Container maxWidth="xl" sx={{ py: 4 }}>
                <PageHeaderSkeleton />
                <KpiCardsSkeleton />
                <ChartCardSkeleton />
            </Container>
        );
    }

    return (
        <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 4 } }}>
            <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 40,
                            height: 40,
                            borderRadius: 2,
                            bgcolor: 'secondary.main',
                            color: 'secondary.contrastText',
                        }}
                    >
                        <PublicIcon fontSize="small" />
                    </Box>
                    <Typography variant="h4" fontWeight={800} letterSpacing="-0.02em">
                        Platform Administration
                    </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ ml: { xs: 0, sm: 6.5 } }}>
                    Companies, accounts, and activity across FixFleet
                </Typography>
                <Box sx={{ mt: 2, ml: { xs: 0, sm: 6.5 } }}>
                    <Button
                        variant="contained"
                        startIcon={<CampaignIcon />}
                        onClick={() => setAnnouncementOpen(true)}
                        sx={{ fontWeight: 700, minHeight: 40 }}
                    >
                        Send Announcement
                    </Button>
                </Box>
            </Box>

            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }} variant="scrollable">
                <Tab label="Overview" id="simple-tab-0" aria-controls="simple-tabpanel-0" />
                <Tab label={`Companies (${companies.length})`} id="simple-tab-1" aria-controls="simple-tabpanel-1" />
                <Tab label="Users" id="simple-tab-2" aria-controls="simple-tabpanel-2" />
                <Tab label="Audit Log" id="simple-tab-3" aria-controls="simple-tabpanel-3" />
            </Tabs>

            {/* Inline panels rather than components/TabPanel: its fixed p:3
                padding boxes these full-width cards in on phones. */}
            <Box role="tabpanel" id={`simple-tabpanel-${tab}`} aria-labelledby={`simple-tab-${tab}`} sx={{ pt: 3 }}>
                {tab === TABS.OVERVIEW && <OverviewTab stats={stats} companies={companies} refreshKey={refreshKey} onNavigate={setTab} />}
                {tab === TABS.COMPANIES && <CompaniesTab companies={companies} onToggleActive={handleToggleActive} />}
                {tab === TABS.USERS && <UsersTab companies={companies} refreshKey={refreshKey} />}
                {tab === TABS.AUDIT && <AuditTab companies={companies} refreshKey={refreshKey} />}
            </Box>

            <SendAnnouncementDialog
                open={announcementOpen}
                onClose={() => setAnnouncementOpen(false)}
                onSend={superadminService.sendAnnouncement}
                companies={companies.filter(co => co.isActive)}
            />
        </Container>
    );
}
