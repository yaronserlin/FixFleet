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
    TableContainer,
    IconButton,
    FormControl,
    Select,
    MenuItem,
    Box,
    CircularProgress,
    TextField,
    InputAdornment,
    Tooltip,
    Chip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import PeopleIcon from '@mui/icons-material/People';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';

import { useAuth } from '../../../contexts/AuthContext';
import { CreateUserForm } from '../UserForms/UserForms';
import { formatUserName } from '../../../utils/formatUtils';
import LoadingComponent from '../../LoadingComponent/LoadingComponent';
import ErrorComponent from '../../ErrorComponent/ErrorComponent';
import DialogComponent from '../../DialogComponent';
import { DEFAULT_ROLE, ROLES } from '../../../constants/roles';

const ROLE_COLOR_MAP = {
    [ROLES.ADMIN]: 'error',
    [ROLES.MECHANIC]: 'primary',
    [ROLES.OPERATOR]: 'default',
};

export default function UserPanel({
    users = [],
    loading,
    error,
    onCreate,
    onDelete,
    onRoleChange,
}) {
    const { user: currentUser } = useAuth();
    const currentUserId = currentUser?.id || currentUser?._id;

    const [dialog, setDialog] = useState({ type: null, user: null });
    const [savingUserId, setSavingUserId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    // Store pending unsaved role changes per user id: { [userId]: 'newRole' }
    const [pendingRoles, setPendingRoles] = useState({});

    const openDialog = useCallback((type, user = null) => {
        setDialog({ type, user });
    }, []);
    const closeDialog = useCallback(() => setDialog({ type: null, user: null }), []);

    const handleDelete = useCallback(async () => {
        if (!dialog.user) return;
        await onDelete(dialog.user._id);
        closeDialog();
    }, [dialog.user, onDelete, closeDialog]);

    const handleCreate = useCallback(
        async (data) => {
            await onCreate(data);
            closeDialog();
        },
        [onCreate, closeDialog]
    );

    const handleRoleSelectChange = (userId, newRole) => {
        setPendingRoles((prev) => ({
            ...prev,
            [userId]: newRole,
        }));
    };

    const handleCancelRoleChange = (userId) => {
        setPendingRoles((prev) => {
            const next = { ...prev };
            delete next[userId];
            return next;
        });
    };

    const handleSaveRole = async (userId) => {
        const newRole = pendingRoles[userId];
        if (!newRole) return;
        setSavingUserId(userId);
        try {
            await onRoleChange(userId, newRole);
            setPendingRoles((prev) => {
                const next = { ...prev };
                delete next[userId];
                return next;
            });
        } finally {
            setSavingUserId(null);
        }
    };

    const filteredUsers = useMemo(() => {
        if (!searchQuery.trim()) return users;
        const q = searchQuery.toLowerCase();
        return users.filter(
            (u) =>
                (u.name || '').toLowerCase().includes(q) ||
                (u.email || '').toLowerCase().includes(q)
        );
    }, [users, searchQuery]);

    if (loading) {
        return (
            <Grid size={{ xs: 12, lg: 6 }}>
                <Paper variant="outlined" sx={{ p: 4, borderRadius: 3, textAlign: 'center', borderLeft: '4px solid #2563EB' }}>
                    <LoadingComponent message="Loading users..." />
                </Paper>
            </Grid>
        );
    }
    if (error) {
        return (
            <Grid size={{ xs: 12, lg: 6 }}>
                <Paper variant="outlined" sx={{ p: 4, borderRadius: 3, textAlign: 'center', borderLeft: '4px solid #2563EB' }}>
                    <ErrorComponent message={error} />
                </Paper>
            </Grid>
        );
    }

    return (
        <Grid size={{ xs: 12, lg: 6 }}>
            <Paper
                variant="outlined"
                sx={{
                    p: { xs: 2, sm: 2.5 },
                    borderRadius: 3,
                    borderLeft: '4px solid #2563EB',
                }}
            >
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                        <PeopleIcon color="primary" />
                        <Box>
                            <Typography variant="h6" fontWeight={700}>
                                User Management
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {users.length} registered accounts
                            </Typography>
                        </Box>
                    </Box>
                    <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => openDialog('create')}
                        sx={{ width: { xs: '100%', sm: 'auto' }, fontWeight: 700, minHeight: 36 }}
                    >
                        Create User
                    </Button>
                </Box>

                <TextField
                    size="small"
                    placeholder="Filter by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    fullWidth
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                            </InputAdornment>
                        ),
                    }}
                    sx={{ mb: 2 }}
                />

                {/* Mobile Card View (< sm) */}
                <Box sx={{ display: { xs: 'flex', sm: 'none' }, flexDirection: 'column', gap: 1.5 }}>
                    {filteredUsers.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
                            No users found matching "{searchQuery}"
                        </Typography>
                    ) : (
                        filteredUsers.map((u) => {
                            const isSelf = Boolean(currentUserId && String(u._id) === String(currentUserId));
                            const isSaving = savingUserId === u._id;
                            const currentRole = u.role || DEFAULT_ROLE;
                            const selectedRole = pendingRoles[u._id] !== undefined ? pendingRoles[u._id] : currentRole;
                            const hasChanged = selectedRole !== currentRole;

                            return (
                                <Paper
                                    key={u._id}
                                    variant="outlined"
                                    sx={{
                                        p: 1.75,
                                        borderRadius: 2,
                                        borderLeft: isSelf ? '3px solid #2563EB' : '3px solid',
                                        borderColor: isSelf ? '#2563EB' : 'divider',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 1.25,
                                    }}
                                >
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <Box sx={{ minWidth: 0, mr: 1 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                                                <Typography variant="body2" fontWeight={700} noWrap>
                                                    {formatUserName(u.name)}
                                                </Typography>
                                                {isSelf && (
                                                    <Chip
                                                        label="You"
                                                        size="small"
                                                        color="primary"
                                                        sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
                                                    />
                                                )}
                                                <Chip
                                                    label={currentRole.toUpperCase()}
                                                    size="small"
                                                    color={ROLE_COLOR_MAP[currentRole] || 'default'}
                                                    variant="outlined"
                                                    sx={{ height: 18, fontSize: '0.6rem', fontWeight: 600 }}
                                                />
                                                {u.mustChangePassword && (
                                                    <Chip
                                                        label="Temp Password"
                                                        size="small"
                                                        color="warning"
                                                        variant="outlined"
                                                        sx={{ height: 18, fontSize: '0.6rem', fontWeight: 600 }}
                                                    />
                                                )}
                                            </Box>
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                sx={{ wordBreak: 'break-all', display: 'block', mt: 0.25 }}
                                            >
                                                {u.email}
                                            </Typography>
                                        </Box>
                                        <Tooltip
                                            title={isSelf ? 'You cannot delete your own account' : 'Delete user'}
                                            arrow
                                        >
                                            <span>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    disabled={isSelf}
                                                    onClick={() => openDialog('delete', u)}
                                                    aria-label={`Delete ${u.name}`}
                                                    sx={{ flexShrink: 0 }}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    </Box>

                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            flexWrap: 'wrap',
                                            gap: 1,
                                            pt: 1,
                                            borderTop: '1px solid',
                                            borderColor: 'divider',
                                        }}
                                    >
                                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                            Role
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Tooltip
                                                title={isSelf ? 'Admins cannot change their own role' : ''}
                                                arrow
                                                disableHoverListener={!isSelf}
                                            >
                                                <span>
                                                    <FormControl variant="outlined" size="small">
                                                        <Select
                                                            value={selectedRole}
                                                            disabled={isSelf || isSaving}
                                                            onChange={(e) => handleRoleSelectChange(u._id, e.target.value)}
                                                            sx={{ fontSize: '0.8rem', height: 32, borderRadius: 1 }}
                                                        >
                                                            <MenuItem value={ROLES.OPERATOR}>Operator</MenuItem>
                                                            <MenuItem value={ROLES.MECHANIC}>Mechanic</MenuItem>
                                                            <MenuItem value={ROLES.ADMIN}>Admin</MenuItem>
                                                        </Select>
                                                    </FormControl>
                                                </span>
                                            </Tooltip>

                                            {hasChanged && !isSelf && (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        color="primary"
                                                        startIcon={!isSaving && <SaveIcon sx={{ fontSize: 14 }} />}
                                                        disabled={isSaving}
                                                        onClick={() => handleSaveRole(u._id)}
                                                        sx={{ minHeight: 32, px: 1.25, fontSize: '0.75rem', fontWeight: 700 }}
                                                    >
                                                        {isSaving ? <CircularProgress size={14} color="inherit" /> : 'Save'}
                                                    </Button>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleCancelRoleChange(u._id)}
                                                        title="Cancel change"
                                                        disabled={isSaving}
                                                        sx={{ p: 0.5 }}
                                                    >
                                                        <CloseIcon sx={{ fontSize: 16 }} />
                                                    </IconButton>
                                                </Box>
                                            )}
                                        </Box>
                                    </Box>
                                </Paper>
                            );
                        })
                    )}
                </Box>

                {/* Desktop Table View (>= sm) */}
                <TableContainer sx={{ display: { xs: 'none', sm: 'block' }, width: '100%', overflowX: 'auto', borderRadius: 2 }}>
                    <Table size="small">
                        <TableHead sx={{ bgcolor: 'background.subtle' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Name</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Email</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Role</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredUsers.map((u) => {
                                const isSelf = Boolean(currentUserId && String(u._id) === String(currentUserId));
                                const isSaving = savingUserId === u._id;
                                const currentRole = u.role || DEFAULT_ROLE;
                                const selectedRole = pendingRoles[u._id] !== undefined ? pendingRoles[u._id] : currentRole;
                                const hasChanged = selectedRole !== currentRole;

                                return (
                                    <TableRow key={u._id} hover sx={{ height: 56 }}>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography variant="body2" fontWeight={600}>
                                                    {formatUserName(u.name)}
                                                </Typography>
                                                {isSelf && (
                                                    <Chip
                                                        label="You"
                                                        size="small"
                                                        color="primary"
                                                        sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                                                    />
                                                )}
                                                {u.mustChangePassword && (
                                                    <Chip
                                                        label="Must Change Password"
                                                        size="small"
                                                        color="warning"
                                                        variant="outlined"
                                                        sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }}
                                                    />
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" color="text.secondary">
                                                {u.email}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Tooltip
                                                    title={isSelf ? 'Admins cannot change their own role' : ''}
                                                    arrow
                                                    disableHoverListener={!isSelf}
                                                >
                                                    <span>
                                                        <FormControl variant="outlined" size="small" sx={{ minWidth: 110 }}>
                                                            <Select
                                                                value={selectedRole}
                                                                disabled={isSelf || isSaving}
                                                                onChange={(e) => handleRoleSelectChange(u._id, e.target.value)}
                                                                sx={{
                                                                    fontSize: '0.8rem',
                                                                    height: 32,
                                                                    borderRadius: 1,
                                                                    borderColor: hasChanged ? 'primary.main' : undefined,
                                                                }}
                                                            >
                                                                <MenuItem value={ROLES.OPERATOR}>Operator</MenuItem>
                                                                <MenuItem value={ROLES.MECHANIC}>Mechanic</MenuItem>
                                                                <MenuItem value={ROLES.ADMIN}>Admin</MenuItem>
                                                            </Select>
                                                        </FormControl>
                                                    </span>
                                                </Tooltip>

                                                {hasChanged && !isSelf && (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <Button
                                                            size="small"
                                                            variant="contained"
                                                            color="primary"
                                                            startIcon={!isSaving && <SaveIcon sx={{ fontSize: 14 }} />}
                                                            disabled={isSaving}
                                                            onClick={() => handleSaveRole(u._id)}
                                                            sx={{ minHeight: 32, px: 1.25, fontSize: '0.75rem', fontWeight: 700 }}
                                                        >
                                                            {isSaving ? <CircularProgress size={14} color="inherit" /> : 'Save'}
                                                        </Button>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleCancelRoleChange(u._id)}
                                                            title="Cancel change"
                                                            disabled={isSaving}
                                                            sx={{ p: 0.5 }}
                                                        >
                                                            <CloseIcon sx={{ fontSize: 16 }} />
                                                        </IconButton>
                                                    </Box>
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Tooltip
                                                title={isSelf ? 'You cannot delete your own account' : 'Delete user'}
                                                arrow
                                            >
                                                <span>
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        disabled={isSelf}
                                                        onClick={() => openDialog('delete', u)}
                                                        aria-label={`Delete ${u.name}`}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Dialogs */}
            <DialogComponent
                open={dialog.type === 'create'}
                onClose={closeDialog}
                title="Create New User"
            >
                <CreateUserForm onSubmit={handleCreate} />
            </DialogComponent>

            <DialogComponent
                open={dialog.type === 'delete'}
                onClose={closeDialog}
                title="Delete User"
            >
                <Typography mb={2}>
                    Are you sure you want to permanently delete{' '}
                    <strong>{formatUserName(dialog.user?.name)}</strong> ({dialog.user?.email})?
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                    <Button onClick={closeDialog} variant="outlined">Cancel</Button>
                    <Button onClick={handleDelete} color="error" variant="contained">Delete</Button>
                </Box>
            </DialogComponent>
        </Grid>
    );
}
