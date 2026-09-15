import React, { useState, useEffect } from 'react';
import {
    Box,
    TextField,
    Button,
    Chip,
    Typography,
    IconButton,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Paper,
    alpha,
    FormHelperText,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import LockIcon from '@mui/icons-material/Lock';
import { useTool } from '../../../contexts/ToolContext';
import { FAULT_STATUS } from '../../../constants/faultStatus';

const VisuallyHiddenInput = styled('input')({
    clip: 'rect(0 0 0 0)',
    clipPath: 'inset(50%)',
    height: 1,
    overflow: 'hidden',
    position: 'absolute',
    bottom: 0,
    left: 0,
    whiteSpace: 'nowrap',
    width: 1,
});

/**
 * Thumbnail preview component for pending uploaded files.
 */
function FileThumbnailPreview({ file, onRemove }) {
    const [previewUrl, setPreviewUrl] = useState(null);

    useEffect(() => {
        if (!file || !file.type.startsWith('image/')) return;
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [file]);

    return (
        <Box
            sx={{
                position: 'relative',
                width: 72,
                height: 72,
                borderRadius: 2,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.subtle',
                flexShrink: 0,
            }}
        >
            {previewUrl ? (
                <Box
                    component="img"
                    src={previewUrl}
                    alt={file.name}
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
            ) : (
                <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    height="100%"
                    color="text.secondary"
                >
                    <PhotoCameraIcon fontSize="small" />
                </Box>
            )}
            <IconButton
                size="small"
                onClick={onRemove}
                aria-label={`Remove ${file.name}`}
                sx={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    p: 0.25,
                    bgcolor: 'rgba(0, 0, 0, 0.65)',
                    color: '#ffffff',
                    '&:hover': { bgcolor: 'error.main' },
                }}
            >
                <DeleteIcon sx={{ fontSize: 14 }} />
            </IconButton>
        </Box>
    );
}

/**
 * Shared form fields for fault forms.
 */
function FaultFormFields({
    values,
    onChange,
    onFilesAdded,
    onRemoveFile,
    tools = [],
    equipment,
    isEdit = false,
    toolError = '',
    lockEquipment = false,
}) {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onFilesAdded(Array.from(e.dataTransfer.files));
        }
    };

    return (
        <Box display="flex" flexDirection="column" gap={2.5}>
            {/* Equipment selector */}
            <FormControl fullWidth required error={Boolean(toolError)}>
                <Select
                    name="tool"
                    value={values.tool || ''}
                    onChange={onChange}
                    disabled={lockEquipment}
                    displayEmpty
                    inputProps={{
                        'aria-label': 'Select Equipment',
                        ...(lockEquipment && { readOnly: true }),
                    }}
                    renderValue={(selected) => {
                        if (!selected) {
                            return (
                                <Typography component="span" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                                    -- Select an equipment --
                                </Typography>
                            );
                        }
                        const found = (equipment && (equipment._id === selected || equipment.id === selected))
                            ? equipment
                            : tools.find(t => (t._id || t.id) === selected);
                        return found
                            ? `${found.name} ${found.localSerialNumber ? `(${found.localSerialNumber})` : (found.serialNumber ? `(${found.serialNumber})` : '')}`
                            : selected;
                    }}
                    sx={{
                        ...(lockEquipment && {
                            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                            '& .MuiSelect-select.Mui-disabled': {
                                WebkitTextFillColor: 'inherit',
                                color: 'text.primary',
                                fontWeight: 600,
                                cursor: 'not-allowed',
                            },
                            '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'divider',
                            },
                        }),
                    }}
                >
                    <MenuItem value="" disabled>
                        <Typography component="span" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                            -- Select an equipment --
                        </Typography>
                    </MenuItem>
                    {tools.map(tool => (
                        <MenuItem key={tool._id || tool.id} value={tool._id || tool.id}>
                            {tool.name} {tool.localSerialNumber ? `(${tool.localSerialNumber})` : (tool.serialNumber ? `(${tool.serialNumber})` : '')}
                        </MenuItem>
                    ))}
                </Select>
                {lockEquipment && (
                    <FormHelperText sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, color: 'text.secondary', fontWeight: 500 }}>
                        <LockIcon sx={{ fontSize: 14 }} /> Equipment is locked for this machine report
                    </FormHelperText>
                )}
                {toolError && <FormHelperText error>{toolError}</FormHelperText>}
            </FormControl>

            {/* Fault code & Engine Hours in one responsive row */}
            <Box display="flex" gap={2} flexDirection={{ xs: 'column', sm: 'row' }}>
                <TextField
                    label="Fault Code"
                    name="code"
                    required
                    fullWidth
                    value={values.code}
                    onChange={onChange}
                    placeholder="e.g. HYD-01 or ENG-104"
                />

                <TextField
                    label="Engine Hours"
                    name="engineHours"
                    type="number"
                    fullWidth
                    inputProps={{ min: 0, step: 'any' }}
                    value={values.engineHours}
                    onChange={onChange}
                    placeholder="e.g. 1250"
                />
            </Box>

            {/* Detailed description */}
            <TextField
                label="Description"
                name="description"
                required
                multiline
                rows={3}
                value={values.description}
                onChange={onChange}
                placeholder="Describe the issue, symptoms, and urgency..."
            />

            {/* Drag & Drop / File Upload Area */}
            <Box>
                <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 0.75, display: 'block' }}>
                    ATTACH PHOTOS
                </Typography>
                <Paper
                    variant="outlined"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    sx={{
                        p: 2,
                        textAlign: 'center',
                        borderStyle: 'dashed',
                        borderColor: isDragging ? 'secondary.main' : 'divider',
                        bgcolor: isDragging ? (theme) => alpha(theme.palette.secondary.main, 0.08) : 'transparent',
                        transition: 'all 0.2s ease',
                    }}
                >
                    <CloudUploadIcon sx={{ fontSize: 36, color: isDragging ? 'secondary.main' : 'text.secondary', mb: 0.5 }} />
                    <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
                        Drag and drop photos here, or select an option:
                    </Typography>
                    <Box display="flex" justifyContent="center" alignItems="center" gap={1.5} flexWrap="wrap">
                        <Button
                            component="label"
                            variant="contained"
                            color="primary"
                            size="small"
                            startIcon={<PhotoCameraIcon />}
                            sx={{ fontWeight: 600 }}
                        >
                            Take Photo
                            <VisuallyHiddenInput
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={onChange}
                            />
                        </Button>
                        <Button
                            component="label"
                            variant="outlined"
                            size="small"
                            sx={{ fontWeight: 600 }}
                        >
                            Browse Files
                            <VisuallyHiddenInput
                                type="file"
                                accept="image/*"
                                onChange={onChange}
                                multiple
                            />
                        </Button>
                    </Box>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                        PNG, JPG, or WEBP up to 10MB each
                    </Typography>
                </Paper>

                {/* Thumbnails preview */}
                {values.files && values.files.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 1.25, mt: 1.5, overflowX: 'auto', py: 0.5 }}>
                        {values.files.map((file, idx) => (
                            <FileThumbnailPreview
                                key={`${file.name}-${idx}`}
                                file={file}
                                onRemove={() => onRemoveFile(idx)}
                            />
                        ))}
                    </Box>
                )}
            </Box>

            {/* Status selector - only visible in edit mode */}
            {isEdit && (
                <>
                    <FormControl fullWidth>
                        <InputLabel id="status-select-label">Status</InputLabel>
                        <Select
                            labelId="status-select-label"
                            label="Status"
                            name="status"
                            value={values.status || FAULT_STATUS.OPEN}
                            onChange={onChange}
                        >
                            <MenuItem value={FAULT_STATUS.OPEN}>Open</MenuItem>
                            <MenuItem value={FAULT_STATUS.CLOSED}>Closed</MenuItem>
                        </Select>
                    </FormControl>

                    {/* Closed date, if status is closed */}
                    {values.status === FAULT_STATUS.CLOSED && (
                        <TextField
                            label="Closed At"
                            name="closedAt"
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            value={values.closedAt}
                            onChange={onChange}
                        />
                    )}
                </>
            )}
        </Box>
    );
}

/**
 * Form for creating a new Fault.
 */
export function CreateFaultForm({
    onSubmit,
    toolId,
    equipmentId,
    equipment,
    lockEquipment = Boolean(equipmentId || toolId || equipment),
    formId = 'create-fault-form',
    hideSubmitButton = false,
}) {
    const activeEquipmentId = equipment?._id || equipment?.id || equipmentId || toolId;
    const { tools = [] } = useTool();
    const [values, setValues] = useState({
        tool: activeEquipmentId || '',
        code: '',
        engineHours: '',
        description: '',
        files: [],
        status: FAULT_STATUS.OPEN,
        closedAt: '',
    });
    const [toolError, setToolError] = useState('');

    useEffect(() => {
        if (activeEquipmentId) {
            setValues(prev => ({ ...prev, tool: activeEquipmentId }));
            setToolError('');
        }
    }, [activeEquipmentId]);

    const handleChange = (e) => {
        if (e.target.type === 'file') {
            const selectedFiles = Array.from(e.target.files || []);
            setValues(prev => ({
                ...prev,
                files: [...prev.files, ...selectedFiles],
            }));
        } else {
            const { name, value } = e.target;
            if (name === 'tool' && value) {
                setToolError('');
            }
            setValues(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleFilesAdded = (newFiles) => {
        setValues(prev => ({
            ...prev,
            files: [...prev.files, ...newFiles],
        }));
    };

    const handleRemoveFile = (indexToRemove) => {
        setValues(prev => ({
            ...prev,
            files: prev.files.filter((_, idx) => idx !== indexToRemove),
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!values.tool) {
            setToolError('Please select an equipment');
            return;
        }
        setToolError('');
        onSubmit(values);
    };

    return (
        <form id={formId} onSubmit={handleSubmit}>
            <FaultFormFields
                values={values}
                onChange={handleChange}
                onFilesAdded={handleFilesAdded}
                onRemoveFile={handleRemoveFile}
                tools={tools}
                equipment={equipment}
                toolError={toolError}
                lockEquipment={lockEquipment}
            />

            {!hideSubmitButton && (
                <Box mt={3} display="flex" justifyContent="flex-end">
                    <Button type="submit" variant="contained" color="primary">
                        Create Fault
                    </Button>
                </Box>
            )}
        </form>
    );
}

/**
 * Form for editing an existing Fault.
 */
export function EditFaultForm({ initialValues, onSubmit, formId = 'edit-fault-form' }) {
    const { tools = [] } = useTool();
    const [values, setValues] = useState({
        tool: initialValues?.tool?._id || initialValues?.tool || '',
        code: initialValues?.code || '',
        engineHours: initialValues?.engineHours ?? '',
        description: initialValues?.description || '',
        files: [],
        status: initialValues?.status || FAULT_STATUS.OPEN,
        closedAt: initialValues?.closedAt ? initialValues.closedAt.slice(0, 10) : '',
    });

    const handleChange = (e) => {
        if (e.target.type === 'file') {
            const selectedFiles = Array.from(e.target.files || []);
            setValues(prev => ({
                ...prev,
                files: [...prev.files, ...selectedFiles],
            }));
        } else {
            const { name, value } = e.target;
            setValues(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleFilesAdded = (newFiles) => {
        setValues(prev => ({
            ...prev,
            files: [...prev.files, ...newFiles],
        }));
    };

    const handleRemoveFile = (indexToRemove) => {
        setValues(prev => ({
            ...prev,
            files: prev.files.filter((_, idx) => idx !== indexToRemove),
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(values);
    };

    return (
        <form id={formId} onSubmit={handleSubmit}>
            <FaultFormFields
                values={values}
                onChange={handleChange}
                onFilesAdded={handleFilesAdded}
                onRemoveFile={handleRemoveFile}
                tools={tools}
                isEdit
            />
            <Box mt={3} display="flex" justifyContent="flex-end">
                <Button type="submit" variant="contained" color="primary">
                    Update Fault
                </Button>
            </Box>
        </form>
    );
}
