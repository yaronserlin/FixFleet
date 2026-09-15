// src/components/Notifications/SendAnnouncementDialog.jsx
import React, { useState } from 'react';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import CampaignIcon from '@mui/icons-material/Campaign';

import notificationsService from '../../services/notificationsService';
import { useNotify } from '../../contexts/NotificationContext';
import { ROLES } from '../../constants/roles';

/** Mirrors backend/constants/notifications.js ANNOUNCEMENT_LIMITS. */
const TITLE_MAX = 120;
const BODY_MAX = 1000;

const AUDIENCES = [
    { value: 'all', label: 'Everyone', roles: undefined },
    { value: ROLES.MECHANIC, label: 'Mechanics', roles: [ROLES.MECHANIC] },
    { value: ROLES.OPERATOR, label: 'Operators', roles: [ROLES.OPERATOR] },
];

/**
 * Admin composer for a broadcast announcement.
 *
 * The audience is always scoped server-side to the sending admin's own
 * company; this dialog only narrows it further by role. The admin is never
 * a recipient of their own broadcast, which is why the copy says "your
 * team" rather than "all users".
 */
export default function SendAnnouncementDialog({ open, onClose }) {
    const notify = useNotify();
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [audience, setAudience] = useState('all');
    const [sending, setSending] = useState(false);
    const [errors, setErrors] = useState({});

    const reset = () => {
        setTitle('');
        setBody('');
        setAudience('all');
        setErrors({});
    };

    const handleClose = () => {
        if (sending) return;
        reset();
        onClose?.();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const nextErrors = {};
        if (!title.trim()) nextErrors.title = 'A title is required';
        if (!body.trim()) nextErrors.body = 'A message is required';
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;

        setSending(true);
        try {
            const selected = AUDIENCES.find(a => a.value === audience);
            const { recipients } = await notificationsService.sendAnnouncement({
                title: title.trim(),
                body: body.trim(),
                ...(selected?.roles ? { roles: selected.roles } : {}),
            });
            notify.success(
                `Announcement sent to ${recipients} ${recipients === 1 ? 'person' : 'people'}`
            );
            reset();
            onClose?.();
        } catch (err) {
            notify.error(err.response?.data?.message || 'Failed to send announcement');
        } finally {
            setSending(false);
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <CampaignIcon color="primary" />
                    <Typography variant="h6" fontWeight={700}>Send Announcement</Typography>
                </Box>
                <IconButton size="small" onClick={handleClose} disabled={sending} aria-label="Close">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <form onSubmit={handleSubmit} noValidate>
                <DialogContent dividers sx={{ pt: 2.5 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                        Everyone you select gets this in their notification feed, and as a push
                        notification on any device where they&apos;ve turned push on.
                    </Typography>

                    <Box sx={{ mb: 2.5 }}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            SEND TO
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                            {AUDIENCES.map(option => (
                                <Chip
                                    key={option.value}
                                    label={option.label}
                                    onClick={() => setAudience(option.value)}
                                    variant={audience === option.value ? 'filled' : 'outlined'}
                                    color={audience === option.value ? 'primary' : 'default'}
                                    sx={{ fontWeight: 600, cursor: 'pointer' }}
                                />
                            ))}
                        </Box>
                    </Box>

                    <TextField
                        fullWidth
                        label="Title"
                        value={title}
                        onChange={(e) => {
                            setTitle(e.target.value);
                            if (errors.title) setErrors(prev => ({ ...prev, title: undefined }));
                        }}
                        error={Boolean(errors.title)}
                        helperText={errors.title || `${title.length}/${TITLE_MAX}`}
                        slotProps={{ htmlInput: { maxLength: TITLE_MAX } }}
                        sx={{ mb: 2.5 }}
                    />

                    <TextField
                        fullWidth
                        label="Message"
                        value={body}
                        onChange={(e) => {
                            setBody(e.target.value);
                            if (errors.body) setErrors(prev => ({ ...prev, body: undefined }));
                        }}
                        error={Boolean(errors.body)}
                        helperText={errors.body || `${body.length}/${BODY_MAX}`}
                        slotProps={{ htmlInput: { maxLength: BODY_MAX } }}
                        multiline
                        minRows={4}
                    />
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={handleClose} disabled={sending}>Cancel</Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={sending}
                        startIcon={sending ? null : <CampaignIcon />}
                        sx={{ fontWeight: 700, minWidth: 140 }}
                    >
                        {sending ? <CircularProgress size={20} color="inherit" /> : 'Send'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
