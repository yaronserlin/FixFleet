// src/pages/EquipmentSchedulePage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Container,
    Typography,
    Box,
    Button,
    Card,
    CardContent,
    Checkbox,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    TextField,
    LinearProgress,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Divider,
    Paper,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SpeedIcon from '@mui/icons-material/Speed';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import { useAuth } from '../contexts/AuthContext';
import { useNotify } from '../contexts/NotificationContext';
import equipmentService from '../services/equipmentService';
import LoadingComponent from '../components/LoadingComponent/LoadingComponent';
import ErrorComponent from '../components/ErrorComponent/ErrorComponent';
import ConfirmDialog from '../components/ConfirmDialog/ConfirmDialog';

export default function EquipmentSchedulePage() {
    const { id, scheduleId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const notify = useNotify();
    const theme = useTheme();

    const [equipment, setEquipment] = useState(null);
    const [schedule, setSchedule] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
    const [completionData, setCompletionData] = useState({
        currentEngineHours: '',
        notes: '',
    });
    const [inProgressNotes, setInProgressNotes] = useState('');
    const [savingNotes, setSavingNotes] = useState(false);

    const canManage = user?.role === 'admin' || user?.role === 'mechanic';

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await equipmentService.getSchedule(id, scheduleId);
            setEquipment(data.equipment);
            setSchedule(data.schedule);
            setInProgressNotes(data.schedule?.inProgressNotes || '');
        } catch (err) {
            console.error('Error loading schedule:', err);
            setError(err.response?.data?.message || 'Failed to load maintenance schedule');
        } finally {
            setLoading(false);
        }
    }, [id, scheduleId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleToggleTask = async (itemId) => {
        if (!canManage) return;
        try {
            const data = await equipmentService.toggleChecklistItem(id, scheduleId, itemId);
            setEquipment(data.equipment);
            setSchedule(data.schedule);
        } catch (err) {
            console.error('Error toggling task:', err);
            notify.error('Failed to update task status');
        }
    };

    const handleSaveProgressNotes = async () => {
        if (!canManage || !id || !scheduleId || savingNotes) return;
        const currentText = (inProgressNotes || '').trim();
        const prevText = (schedule?.inProgressNotes || '').trim();
        if (currentText === prevText) return;

        try {
            setSavingNotes(true);
            const data = await equipmentService.updateScheduleProgress(id, scheduleId, {
                inProgressNotes: inProgressNotes,
            });
            if (data?.schedule) {
                setSchedule(data.schedule);
            }
            if (data?.equipment) {
                setEquipment(data.equipment);
            }
            notify.success('Service progress notes saved');
        } catch (err) {
            console.error('Failed to save progress notes:', err);
            notify.error('Failed to save service progress notes');
        } finally {
            setSavingNotes(false);
        }
    };

    const [confirmIncompleteOpen, setConfirmIncompleteOpen] = useState(false);

    const openCompleteForm = () => {
        setCompletionData({
            currentEngineHours: '',
            notes: inProgressNotes || schedule?.inProgressNotes || '',
        });
        setCompleteDialogOpen(true);
    };

    const handleOpenCompleteDialog = () => {
        const checklist = schedule?.checklist || [];
        const completedCount = checklist.filter((item) => item.done).length;
        const hasIncomplete = checklist.length > 0 && completedCount < checklist.length;

        if (hasIncomplete) {
            setConfirmIncompleteOpen(true);
            return;
        }

        openCompleteForm();
    };

    const handleConfirmComplete = async (e) => {
        e.preventDefault();
        try {
            const currentHours = equipment?.currentEngineHours || 0;
            await equipmentService.completeSchedule(id, scheduleId, {
                currentEngineHours: completionData.currentEngineHours !== ''
                    ? parseFloat(completionData.currentEngineHours)
                    : currentHours,
                notes: completionData.notes,
            });
            notify.success('Service logged and schedule updated');
            setCompleteDialogOpen(false);
            navigate(`/equipment/${id}?tab=maintenance`, { state: { tab: 1, refreshedAt: Date.now() }, replace: true });
        } catch (err) {
            console.error('Complete schedule error:', err);
            notify.error('Failed to log completed maintenance');
        }
    };

    if (loading) return <LoadingComponent />;
    if (error) return <ErrorComponent message={error} />;
    if (!schedule || !equipment) return <Typography>Schedule not found.</Typography>;

    const checklist = schedule.checklist || [];
    const completedCount = checklist.filter((item) => item.done).length;
    const progressPercent = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0;
    const currentHours = equipment.currentEngineHours || 0;

    return (
        <Container maxWidth="md" sx={{ mt: 3, mb: 6 }}>
            {/* Navigation back */}
            <Box mb={2}>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate(`/equipment/${id}?tab=maintenance`, { state: { tab: 1, refreshedAt: Date.now() } })}
                    color="inherit"
                >
                    Back to Maintenance
                </Button>
            </Box>

            {/* Schedule Header Card */}
            <Card variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>
                <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2} mb={1}>
                        <Box sx={{ flex: '1 1 250px', minWidth: 0 }}>
                            <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ wordBreak: 'break-word' }}>
                                {schedule.title}
                            </Typography>
                            <Typography variant="subtitle1" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                                Equipment: {equipment.name} (Serial: {equipment.localSerialNumber || equipment.serialNumber || 'N/A'})
                            </Typography>
                        </Box>
                        <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
                            <Chip
                                icon={<SpeedIcon />}
                                label={`Meter: ${currentHours} hrs`}
                                color="primary"
                                variant="outlined"
                            />
                            <Chip
                                label={(schedule.status || 'NORMAL').toUpperCase()}
                                color={schedule.status === 'overdue' ? 'error' : (schedule.status === 'due_soon' ? 'warning' : 'success')}
                                sx={{ fontWeight: 700 }}
                            />
                            {checklist.length > 0 && completedCount > 0 && completedCount < checklist.length && (
                                <Chip
                                    label={`IN PROGRESS (${completedCount}/${checklist.length})`}
                                    color="warning"
                                    sx={{ fontWeight: 700 }}
                                />
                            )}
                            {checklist.length > 0 && completedCount === checklist.length && (
                                <Chip
                                    label="ALL TASKS DONE"
                                    color="success"
                                    sx={{ fontWeight: 700 }}
                                />
                            )}
                        </Box>
                    </Box>

                    {schedule.description && (
                        <Typography variant="body1" sx={{ mt: 1, mb: 2, color: 'text.secondary' }}>
                            {schedule.description}
                        </Typography>
                    )}

                    <Divider sx={{ my: 1.5 }} />

                    <Box display="flex" gap={3} flexWrap="wrap">
                        <Typography variant="caption" color="text.secondary">
                            Frequency: {schedule.intervalHours > 0 ? `Every ${schedule.intervalHours} engine hours` : ''}
                            {schedule.intervalHours > 0 && schedule.intervalDays > 0 ? ' or ' : ''}
                            {schedule.intervalDays > 0 ? `Every ${schedule.intervalDays} days` : ''}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Last performed: {schedule.lastPerformedHours ?? 0} hrs
                            {schedule.lastPerformedDate ? ` on ${new Date(schedule.lastPerformedDate).toLocaleDateString('en-GB')}` : ''}
                        </Typography>
                        {schedule.nextDueHours > 0 && (
                            <Typography variant="caption" fontWeight="bold" color="primary">
                                Next due at: {schedule.nextDueHours} hrs
                            </Typography>
                        )}
                    </Box>
                </CardContent>
            </Card>

            {/* Todo List / Checklist Section */}
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={2}>
                    <Box>
                        <Typography variant="h6" fontWeight="bold">
                            Maintenance Checklist / To-Do List
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {checklist.length === 0
                                ? 'No tasks added yet. Add tasks below to build this maintenance routine.'
                                : `${completedCount} of ${checklist.length} tasks completed (${progressPercent}%)`}
                        </Typography>
                    </Box>

                    {canManage && (
                        <Button
                            variant="contained"
                            color="success"
                            size="medium"
                            startIcon={<CheckCircleOutlineIcon />}
                            onClick={handleOpenCompleteDialog}
                            sx={{ minHeight: 44 }}
                        >
                            Complete
                        </Button>
                    )}
                </Box>

                {checklist.length > 0 && (
                    <Box display="flex" alignItems="center" gap={2} mb={3}>
                        <LinearProgress
                            variant="determinate"
                            value={progressPercent}
                            sx={{ height: 10, borderRadius: 5, flex: 1 }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                            {progressPercent}%
                        </Typography>
                    </Box>
                )}

                {checklist.length === 0 ? (
                    <Box py={4} textAlign="center">
                        <CheckCircleOutlineIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                        <Typography color="text.secondary">
                            No to-do tasks configured for this maintenance schedule.
                        </Typography>
                    </Box>
                ) : (
                    <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
                        {checklist.map((item) => (
                            <ListItem
                                key={item._id}
                                dense
                                button={canManage}
                                onClick={() => handleToggleTask(item._id)}
                                sx={{
                                    borderRadius: 1,
                                    mb: 0.5,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 40 }}>
                                    <Checkbox
                                        edge="start"
                                        checked={Boolean(item.done)}
                                        tabIndex={-1}
                                        disableRipple
                                        disabled={!canManage}
                                    />
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.text}
                                    primaryTypographyProps={{
                                        sx: {
                                            textDecoration: item.done ? 'line-through' : 'none',
                                            color: item.done ? 'success.main' : 'text.primary',
                                            fontWeight: item.done ? 'normal' : 500,
                                        },
                                    }}
                                />
                            </ListItem>
                        ))}
                    </List>
                )}
            </Paper>

            {/* Service Process Notes (In-Progress) */}
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} mb={1}>
                    <Box>
                        <Typography variant="h6" fontWeight="bold">
                            Service Process Notes & Observations
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Notes entered here are saved while the service is in progress and carried forward into the final service record.
                        </Typography>
                    </Box>
                    {canManage && (
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={handleSaveProgressNotes}
                            disabled={savingNotes}
                        >
                            {savingNotes ? 'Saving...' : 'Save Notes'}
                        </Button>
                    )}
                </Box>
                <TextField
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="e.g. Inspected fuel filter, noticed slight wear on alternator belt, hydraulic fluid topped up..."
                    value={inProgressNotes}
                    onChange={(e) => setInProgressNotes(e.target.value)}
                    onBlur={handleSaveProgressNotes}
                    disabled={!canManage}
                    sx={{ mt: 1 }}
                />
            </Paper>

            {/* Complete Service Dialog */}
            <Dialog open={completeDialogOpen} onClose={() => setCompleteDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Log Completed Service</DialogTitle>
                <Box component="form" onSubmit={handleConfirmComplete}>
                    <DialogContent dividers>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                            {schedule.title}
                        </Typography>
                        <TextField
                            label="Current Engine Hours at Service"
                            type="number"
                            fullWidth
                            required
                            placeholder={`e.g. ${currentHours}`}
                            inputProps={{ min: 0, step: 'any' }}
                            value={completionData.currentEngineHours}
                            onChange={(e) => setCompletionData({ ...completionData, currentEngineHours: e.target.value })}
                            helperText={
                                completionData.currentEngineHours !== '' && parseFloat(completionData.currentEngineHours) < currentHours
                                    ? `Note: Entered hours (${completionData.currentEngineHours} hrs) are lower than current equipment record (${currentHours} hrs). Log records your input; machine keeps highest.`
                                    : `Current equipment reading: ${currentHours} hrs`
                            }
                            sx={{ mb: 2, mt: 1 }}
                        />
                        <TextField
                            label="Service Notes / Parts Used (optional)"
                            fullWidth
                            multiline
                            rows={3}
                            placeholder="Replaced filter part #X, 15W40 oil filled, tested OK"
                            value={completionData.notes}
                            onChange={(e) => setCompletionData({ ...completionData, notes: e.target.value })}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setCompleteDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" variant="contained" color="success" sx={{ minHeight: 44 }}>
                            Complete
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>

            {/* Incomplete Checklist Confirmation Dialog */}
            <ConfirmDialog
                open={confirmIncompleteOpen}
                title="Incomplete Checklist Items"
                message={`Only ${checklist.filter(item => item.done).length} of ${checklist.length} checklist tasks are marked complete. Are you sure you want to complete this service routine without finishing all items?`}
                confirmText="Complete Service Anyway"
                cancelText="Back to Checklist"
                confirmColor="warning"
                onConfirm={() => {
                    setConfirmIncompleteOpen(false);
                    openCompleteForm();
                }}
                onCancel={() => setConfirmIncompleteOpen(false)}
            />
        </Container>
    );
}
