import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Container, Typography, Box, Button, Tabs, Tab, Chip, Paper } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SpeedIcon from '@mui/icons-material/Speed';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FaultList from '../components/Fault/FaultList/FaultList';
import FaultDetailsDialog from '../components/Fault/FaultDetailsDialog/FaultDetailsDialog';
import CreateFaultDialog from '../components/Fault/CreateFaultDialog/CreateFaultDialog';
import CloseFaultDialog from '../components/Fault/CloseFaultDialog/CloseFaultDialog';
import EquipmentMaintenanceTab from '../components/Tool/EquipmentMaintenanceTab/EquipmentMaintenanceTab';
import EquipmentBooksTab from '../components/Tool/EquipmentBooksTab/EquipmentBooksTab';
import LoadingComponent from '../components/LoadingComponent/LoadingComponent';
import ErrorComponent from '../components/ErrorComponent/ErrorComponent';
import ConfirmDialog from '../components/ConfirmDialog/ConfirmDialog';
import { useEquipment } from '../contexts/EquipmentContext';
import { useFault } from '../contexts/FaultContext';
import { useAuth } from '../contexts/AuthContext';
import equipmentService from '../services/equipmentService';
import { ROUTES } from '../constants/routes';
import { FAULT_STATUS } from '../constants/faultStatus';

function a11yProps(index) {
    return {
        id: `equipment-tab-${index}`,
        'aria-controls': `equipment-tabpanel-${index}`,
    };
}

function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`equipment-tabpanel-${index}`}
            aria-labelledby={`equipment-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ pt: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

export default function EquipmentPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const { equipment, loading, error: equipmentError, fetchEquipment } = useEquipment();
    const { faults, error: faultError, fetchFaults, createFault, deleteFault, closeFault, reopenFault } = useFault(id);

    const [selectedFault, setSelectedFault] = useState(null);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [closeDialogOpen, setCloseDialogOpen] = useState(false);
    const [faultToClose, setFaultToClose] = useState(null);
    const [faultToDelete, setFaultToDelete] = useState(null);

    // Tab state: 0 = Faults, 1 = Maintenance Schedule, 2 = Books & Manuals
    const resolveTab = useCallback(() => {
        if (location.state?.tab !== undefined) return Number(location.state.tab);
        const tabParam = searchParams.get('tab');
        if (tabParam === 'maintenance') return 1;
        if (tabParam === 'books' || tabParam === 'manuals') return 2;
        if (tabParam === 'faults') return 0;
        return 0;
    }, [location.state, searchParams]);

    const [value, setValue] = useState(resolveTab);

    useEffect(() => {
        setValue(resolveTab());
    }, [resolveTab]);

    const [toolData, setToolData] = useState(null);

    const loadTool = useCallback(async () => {
        if (!id) return;
        try {
            const fresh = await equipmentService.getById(id);
            setToolData(fresh);
            return fresh;
        } catch (err) {
            console.error('Failed to load equipment details:', err);
        }
    }, [id]);

    useEffect(() => {
        loadTool();
        fetchEquipment();
        if (fetchFaults) fetchFaults();
    }, [loadTool, fetchEquipment, fetchFaults, location.key, location.search, location.state]);

    const tool = toolData || equipment.find((t) => t._id === id);

    const handleRefresh = useCallback(async () => {
        await Promise.all([
            loadTool(),
            fetchEquipment(),
            fetchFaults ? fetchFaults() : Promise.resolve(),
        ]);
    }, [loadTool, fetchEquipment, fetchFaults]);

    const handleChange = (event, newValue) => {
        setValue(newValue);
    };

    const handleFaultClick = (fault) => {
        setSelectedFault(fault);
        setDetailDialogOpen(true);
    };

    const handleCloseAll = () => {
        setDetailDialogOpen(false);
        setCreateDialogOpen(false);
        setCloseDialogOpen(false);
        setSelectedFault(null);
        setFaultToClose(null);
    };

    const handleDeletePrompt = (fault) => {
        setFaultToDelete(fault);
    };

    const handleConfirmDeleteFault = async () => {
        if (!faultToDelete) return;
        await deleteFault(faultToDelete._id);
        setFaultToDelete(null);
        setDetailDialogOpen(false);
        await handleRefresh();
    };

    const handleOpenCloseDialog = (fault) => {
        setFaultToClose(fault);
        setCloseDialogOpen(true);
    };

    const handleConfirmCloseFault = async (fault, closeData) => {
        const payload = typeof closeData === 'object' && closeData !== null
            ? closeData
            : { engineHours: closeData };
        await closeFault(fault._id, payload);
        setCloseDialogOpen(false);
        setFaultToClose(null);
        await handleRefresh();
    };

    const handleReopenFault = async (fault) => {
        await reopenFault(fault._id);
        await handleRefresh();
    };

    const handleCreateSubmit = async (values) => {
        if (!user || !tool) return;
        if (!values.description || !values.code) return;

        const data = {
            ...values,
            tool: tool._id,
            operator: user.id || user._id,
        };

        await createFault(data);
        handleCloseAll();
        await handleRefresh();
    };

    if (loading) {
        return <LoadingComponent />;
    }

    if (faultError || equipmentError) {
        return <ErrorComponent message={faultError || equipmentError} />;
    }

    if (!tool) {
        return (
            <Container sx={{ mt: 4 }}>
                <Typography>No equipment found.</Typography>
            </Container>
        );
    }

    const booksCount = tool.books?.length || 0;
    const maintenanceCount = tool.maintenanceSchedule?.length || 0;
    const openFaultsCount = (faults || []).filter(f => f.status === FAULT_STATUS.OPEN).length;

    return (
        <Container sx={{ mt: 3, mb: 6 }}>
            {/* Back button */}
            <Box mb={2}>
                <Button
                    size="small"
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate(ROUTES.EQUIPMENT)}
                    color="primary"
                >
                    Back to Fleet Directory
                </Button>
            </Box>

            {/* Equipment Header Banner */}
            <Paper
                variant="outlined"
                sx={{
                    p: { xs: 2.5, sm: 3 },
                    borderRadius: 3,
                    mb: 3,
                    bgcolor: openFaultsCount > 0 ? 'rgba(220,38,38,0.04)' : 'rgba(22,163,74,0.04)',
                    borderLeft: openFaultsCount > 0 ? '4px solid #DC2626' : '4px solid #16A34A',
                }}
            >
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
                    <Box sx={{ minWidth: 0, flex: '1 1 auto' }}>
                        <Box display="flex" alignItems="center" flexWrap="wrap" gap={1.5} mb={1}>
                            <Typography
                                variant="h4"
                                fontWeight={800}
                                letterSpacing="-0.02em"
                                sx={{
                                    fontSize: { xs: '1.5rem', sm: '2rem', md: '2.25rem' },
                                    wordBreak: 'break-word',
                                }}
                            >
                                {tool.name}
                            </Typography>
                            {tool.localSerialNumber && (
                                <Chip
                                    label={`UNIT: ${tool.localSerialNumber}`}
                                    color="secondary"
                                    size="small"
                                    sx={{ fontWeight: 700 }}
                                />
                            )}
                            <Chip
                                icon={openFaultsCount > 0 ? <WarningAmberIcon /> : <CheckCircleIcon />}
                                label={openFaultsCount > 0 ? `${openFaultsCount} Active Fault${openFaultsCount > 1 ? 's' : ''}` : 'Operational'}
                                color={openFaultsCount > 0 ? 'error' : 'success'}
                                size="small"
                                sx={{ fontWeight: 700, fontSize: '0.8rem', height: 28 }}
                            />
                        </Box>

                        <Box display="flex" flexWrap="wrap" gap={2} alignItems="center">
                            {tool.model && (
                                <Typography variant="body2" color="text.secondary">
                                    <strong>Model:</strong> {tool.model}
                                </Typography>
                            )}
                            {tool.serialNumber && (
                                <Typography variant="body2" color="text.secondary">
                                    <strong>Serial:</strong> {tool.serialNumber}
                                </Typography>
                            )}
                            {tool.currentEngineHours !== undefined && (
                                <Chip
                                    icon={<SpeedIcon sx={{ fontSize: '1rem !important' }} />}
                                    label={`${tool.currentEngineHours} Operating Hours`}
                                    size="small"
                                    variant="outlined"
                                    color="primary"
                                    sx={{ fontWeight: 600 }}
                                />
                            )}
                        </Box>

                        {tool.description && (
                            <Typography variant="body2" sx={{ mt: 1.5, color: 'text.secondary' }}>
                                {tool.description}
                            </Typography>
                        )}
                    </Box>
                </Box>
            </Paper>

            <Box sx={{ mt: 2 }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs
                        value={value}
                        onChange={handleChange}
                        aria-label="tabs for equipment details"
                        variant="fullWidth"
                        textColor="primary"
                        indicatorColor="primary"
                    >
                        <Tab
                            label={
                                <Box display="flex" alignItems="center" gap={1}>
                                    <span>Reported Faults</span>
                                    <Chip
                                        label={faults?.length || 0}
                                        size="small"
                                        color={openFaultsCount > 0 ? 'error' : 'default'}
                                        sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }}
                                    />
                                </Box>
                            }
                            {...a11yProps(0)}
                        />
                        <Tab
                            label={
                                <Box display="flex" alignItems="center" gap={1}>
                                    <span>Maintenance</span>
                                    <Chip
                                        label={maintenanceCount}
                                        size="small"
                                        sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }}
                                    />
                                </Box>
                            }
                            {...a11yProps(1)}
                        />
                        <Tab
                            label={
                                <Box display="flex" alignItems="center" gap={1}>
                                    <span>Manuals &amp; Books</span>
                                    <Chip
                                        label={booksCount}
                                        size="small"
                                        sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }}
                                    />
                                </Box>
                            }
                            {...a11yProps(2)}
                        />
                    </Tabs>
                </Box>

                <TabPanel value={value} index={0}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={3}>
                        <Typography variant="h6">Reported Faults</Typography>
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<AddIcon />}
                            onClick={() => setCreateDialogOpen(true)}
                            sx={{ minHeight: 44 }}
                        >
                            Create
                        </Button>
                    </Box>
                    <FaultList
                        faults={faults}
                        onFaultClick={handleFaultClick}
                        onCloseFault={handleOpenCloseDialog}
                        onReopenFault={handleReopenFault}
                        onDeleteFault={handleDeletePrompt}
                    />
                </TabPanel>

                <TabPanel value={value} index={1}>
                    <EquipmentMaintenanceTab equipment={tool} tool={tool} onRefresh={handleRefresh} />
                </TabPanel>

                <TabPanel value={value} index={2}>
                    <EquipmentBooksTab equipment={tool} tool={tool} onRefresh={handleRefresh} />
                </TabPanel>
            </Box>

            <FaultDetailsDialog
                open={detailDialogOpen}
                onClose={handleCloseAll}
                fault={selectedFault}
                onDeleteFault={handleDeletePrompt}
                onCloseFault={handleOpenCloseDialog}
                onReopenFault={handleReopenFault}
            />

            <CreateFaultDialog
                open={createDialogOpen}
                onClose={handleCloseAll}
                onSubmit={handleCreateSubmit}
                equipmentId={tool?._id}
                toolId={tool?._id}
                equipment={tool}
                lockEquipment={true}
            />

            <CloseFaultDialog
                open={closeDialogOpen}
                onClose={() => setCloseDialogOpen(false)}
                onConfirm={handleConfirmCloseFault}
                fault={faultToClose}
                equipment={tool}
                tool={tool}
            />

            {/* In-app delete confirmation dialog */}
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
