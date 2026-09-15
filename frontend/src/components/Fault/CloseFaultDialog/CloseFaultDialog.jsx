import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Typography,
    Box,
    Chip,
    Alert,
    IconButton,
} from '@mui/material';
import SpeedIcon from '@mui/icons-material/Speed';
import CloseIcon from '@mui/icons-material/Close';

export default function CloseFaultDialog({ open, onClose, onConfirm, fault, tool, equipment }) {
    const activeEquipment = equipment || tool;
    const lastReportedHours = activeEquipment?.currentEngineHours ?? fault?.engineHours ?? 0;
    const [engineHours, setEngineHours] = useState('');
    const [resolutionDescription, setResolutionDescription] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (open) {
            setEngineHours('');
            setResolutionDescription('');
            setError('');
        }
    }, [open]);

    const handleConfirm = () => {
        const val = parseFloat(engineHours);
        if (isNaN(val) || val < 0) {
            setError('Please enter a valid non-negative engine hours reading.');
            return;
        }

        setError('');
        onConfirm(fault, {
            engineHours: val,
            resolutionDescription: resolutionDescription.trim(),
        });
    };

    if (!fault) return null;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            sx={{
                '& .MuiDialog-paper': {
                    m: { xs: 2, sm: 3 },
                    borderRadius: 3,
                },
            }}
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, pr: 1.5, fontWeight: 700 }}>
                <span>Close Fault & Update Hours</span>
                <IconButton onClick={onClose} size="small" aria-label="close">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Box mb={2}>
                    <Typography variant="subtitle1" fontWeight="bold">
                        {fault.code || 'Fault'} — {fault.description}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Equipment: {activeEquipment?.name || fault.tool?.name || 'Equipment'}
                    </Typography>
                </Box>

                <Alert severity="info" sx={{ mb: 2.5 }}>
                    Closing this fault requires recording the current engine operating hours to update equipment maintenance schedules.
                </Alert>

                <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                    <TextField
                        label="Closing Engine Hours"
                        type="number"
                        placeholder={`e.g. ${lastReportedHours}`}
                        inputProps={{ min: 0, step: 'any' }}
                        value={engineHours}
                        onChange={(e) => {
                            setEngineHours(e.target.value);
                            setError('');
                        }}
                        error={Boolean(error)}
                        helperText={
                            error ||
                            (engineHours !== '' && parseFloat(engineHours) < lastReportedHours
                                ? `Note: Entered hours (${engineHours} hrs) are lower than current equipment reading (${lastReportedHours} hrs). Log preserves your reading; machine keeps highest.`
                                : 'Enter meter reading at completion')
                        }
                        sx={{ flex: 1, minWidth: 200 }}
                        required
                    />

                    <Chip
                        icon={<SpeedIcon />}
                        label={`Current meter: ${lastReportedHours} hrs`}
                        color="secondary"
                        variant="outlined"
                        sx={{ fontWeight: 500, height: 40, px: 1 }}
                    />
                </Box>

                <TextField
                    label="Resolution Notes & Further Information"
                    multiline
                    rows={3}
                    fullWidth
                    placeholder="Provide details on repair actions taken, parts replaced, inspections completed, or other notes for future reference..."
                    value={resolutionDescription}
                    onChange={(e) => setResolutionDescription(e.target.value)}
                    helperText="Optional: Document the work done for equipment maintenance history and audit trail"
                    sx={{ mt: 2.5 }}
                />
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose} color="inherit">
                    Cancel
                </Button>
                <Button
                    onClick={handleConfirm}
                    variant="contained"
                    color="success"
                >
                    Confirm & Resolve
                </Button>
            </DialogActions>
        </Dialog>
    );
}
