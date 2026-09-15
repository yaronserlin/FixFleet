import React from 'react';
import {
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Box,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

export default function DialogComponent({
    open,
    onClose,
    title,
    children,
    onSubmit,
    onDelete,
    submitButtonText = 'Submit',
    cancelButtonText = 'Cancel',
    deleteButtonText = 'Delete',
    showActions,
}) {
    const hasActions = showActions !== undefined ? showActions : Boolean(onSubmit || onDelete);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            sx={{ '& .MuiDialog-paper': { m: { xs: 2, sm: 3 }, borderRadius: 3 } }}
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, pr: 1.5 }}>
                <Box component="span" sx={{ fontWeight: 700 }}>
                    {title}
                </Box>
                <IconButton onClick={onClose} size="small" aria-label="close">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
                {children}
            </DialogContent>
            {hasActions && (
                <DialogActions sx={{ justifyContent: onDelete ? 'space-between' : 'flex-end', px: 3, py: 1.5 }}>
                    {onDelete && (
                        <Button onClick={onDelete} color="error" variant="outlined">
                            {deleteButtonText}
                        </Button>
                    )}
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button onClick={onClose} variant="outlined">{cancelButtonText}</Button>
                        {onSubmit && (
                            <Button onClick={onSubmit} variant="contained" color="primary">
                                {submitButtonText}
                            </Button>
                        )}
                    </Box>
                </DialogActions>
            )}
        </Dialog>
    );
}