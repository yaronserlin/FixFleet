import React, { useEffect, useState, useCallback } from 'react';
import { Container, Typography, Grid, Box, Chip } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

import adminService from '../services/adminService';
import UserPanel from '../components/User/UserPanel/UserPanel';
import ToolsPanel from '../components/Tool/ToolsPanel/ToolsPanel';
import LoadingComponent from '../components/LoadingComponent/LoadingComponent';
import { useTool } from '../contexts/ToolContext';
import { useNotify } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';

/**
 * Page-level component that fetches both users and tools,
 * then delegates display + CRUD handlers to each panel.
 */
export default function AdminDashboard() {
    const notify = useNotify();
    const { user: currentUser, setUser } = useAuth();

    // tools from context
    const {
        tools,
        loading: toolLoading,
        error: toolError,
        createTool,
        updateTool,
        deleteTool,
    } = useTool();

    // users state
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [errorUsers, setErrorUsers] = useState(null);

    // fetch users once
    useEffect(() => {
        let isMounted = true;
        adminService
            .getUsers()
            .then((data) => {
                if (isMounted) setUsers(data);
            })
            .catch((err) => {
                if (isMounted) setErrorUsers(err);
            })
            .finally(() => {
                if (isMounted) setLoadingUsers(false);
            });
        return () => {
            isMounted = false;
        };
    }, []);

    // tool handlers (just forward to context)
    const handleCreateTool = useCallback(
        async (toolData) => {
            await createTool(toolData);
        },
        [createTool]
    );
    const handleUpdateTool = useCallback(
        async (id, toolData) => {
            await updateTool(id, toolData);
        },
        [updateTool]
    );
    const handleDeleteTool = useCallback(
        async (id) => {
            await deleteTool(id);
        },
        [deleteTool]
    );

    // user handlers (local)
    const handleCreateUser = useCallback(
        async (userData) => {
            try {
                const newUser = await adminService.createUser(userData);
                setUsers((prev) => [...prev, newUser]);
                notify.success('User created successfully');
            } catch (err) {
                console.error('Create user error:', err);
                notify.error('Failed to create user');
            }
        },
        [notify]
    );
    const handleDeleteUser = useCallback(
        async (id) => {
            try {
                await adminService.deleteUser(id);
                setUsers((prev) => prev.filter((u) => u._id !== id));
                notify.success('User deleted');
            } catch (err) {
                console.error('Delete user error:', err);
                notify.error('Failed to delete user');
            }
        },
        [notify]
    );
    const handleChangeUserRole = useCallback(
        async (id, role) => {
            try {
                const updated = await adminService.updateUserRole(id, role);
                setUsers((prev) => prev.map((u) => (u._id === id ? updated : u)));
                if (currentUser && String(currentUser.id || currentUser._id) === String(id)) {
                    setUser(prev => ({ ...prev, role: updated.role }));
                }
                notify.success(`User role updated to ${role} successfully`);
            } catch (err) {
                console.error('Role update error:', err);
                notify.error(err.response?.data?.message || 'Failed to update user role');
                throw err;
            }
        },
        [notify, currentUser, setUser]
    );

    if (loadingUsers && users.length === 0) {
        return (
            <Container sx={{ mt: 4, mb: 6 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                    <LoadingComponent message="Loading system administration..." />
                </Box>
            </Container>
        );
    }

    return (
        <Container sx={{ mt: 3, mb: 6 }}>
            {/* Header with Title & Stat overview */}
            <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 40,
                            height: 40,
                            borderRadius: 2,
                            bgcolor: 'primary.main',
                            color: 'primary.contrastText',
                        }}
                    >
                        <AdminPanelSettingsIcon fontSize="small" />
                    </Box>
                    <Typography variant="h4" fontWeight={800} letterSpacing="-0.02em">
                        System Administration
                    </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ ml: { xs: 0, sm: 6.5 } }}>
                    Manage user access privileges, company staff accounts, and equipment records
                </Typography>

                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mt: 2, ml: { xs: 0, sm: 6.5 } }}>
                    <Chip
                        icon={<PeopleIcon sx={{ fontSize: '1rem !important' }} />}
                        label={`${users.length} Active User${users.length !== 1 ? 's' : ''}`}
                        color="primary"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                    />
                    <Chip
                        icon={<PrecisionManufacturingIcon sx={{ fontSize: '1rem !important' }} />}
                        label={`${tools.length} Equipment Registered`}
                        color="secondary"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                    />
                </Box>
            </Box>

            <Grid container spacing={3}>
                <UserPanel
                    users={users}
                    loading={loadingUsers}
                    error={errorUsers}
                    onCreate={handleCreateUser}
                    onDelete={handleDeleteUser}
                    onRoleChange={handleChangeUserRole}
                />

                <ToolsPanel
                    tools={tools}
                    loading={toolLoading}
                    error={toolError}
                    onCreate={handleCreateTool}
                    onUpdate={handleUpdateTool}
                    onDelete={handleDeleteTool}
                />
            </Grid>
        </Container>
    );
}