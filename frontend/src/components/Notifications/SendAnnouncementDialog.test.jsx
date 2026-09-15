// src/components/Notifications/SendAnnouncementDialog.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SendAnnouncementDialog from './SendAnnouncementDialog';
import notificationsService from '../../services/notificationsService';
import { useNotify } from '../../contexts/NotificationContext';

jest.mock('../../services/notificationsService', () => ({
    __esModule: true,
    default: { sendAnnouncement: jest.fn() },
}));
jest.mock('../../contexts/NotificationContext', () => ({
    __esModule: true,
    useNotify: jest.fn(),
}));

const notify = { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() };

function setup({ open = true } = {}) {
    useNotify.mockReturnValue(notify);
    const onClose = jest.fn();
    render(<SendAnnouncementDialog open={open} onClose={onClose} />);
    return { onClose };
}

const typeIn = (label, value) =>
    fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('SendAnnouncementDialog', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        notificationsService.sendAnnouncement.mockResolvedValue({ recipients: 4 });
    });

    it('renders nothing until it is opened', () => {
        setup({ open: false });
        expect(screen.queryByText('Send Announcement')).not.toBeInTheDocument();
    });

    it('sends to everyone by default, with no role filter', async () => {
        const { onClose } = setup();
        typeIn(/title/i, 'Depot closed');
        typeIn(/message/i, 'The north depot is closed Friday.');

        fireEvent.click(screen.getByRole('button', { name: /^send$/i }));

        await waitFor(() => expect(notificationsService.sendAnnouncement).toHaveBeenCalled());
        // No `roles` key at all: the server reads that as "everyone in my company".
        expect(notificationsService.sendAnnouncement).toHaveBeenCalledWith({
            title: 'Depot closed',
            body: 'The north depot is closed Friday.',
        });
        await waitFor(() => expect(onClose).toHaveBeenCalled());
    });

    it('narrows the audience to a single role when one is picked', async () => {
        setup();
        fireEvent.click(screen.getByText('Mechanics'));
        typeIn(/title/i, 'Toolbox talk');
        typeIn(/message/i, '8am in the workshop.');

        fireEvent.click(screen.getByRole('button', { name: /^send$/i }));

        await waitFor(() => expect(notificationsService.sendAnnouncement).toHaveBeenCalledWith({
            title: 'Toolbox talk',
            body: '8am in the workshop.',
            roles: ['mechanic'],
        }));
    });

    it('reports how many people it reached', async () => {
        setup();
        typeIn(/title/i, 'Notice');
        typeIn(/message/i, 'Body');

        fireEvent.click(screen.getByRole('button', { name: /^send$/i }));

        await waitFor(() => expect(notify.success).toHaveBeenCalledWith('Announcement sent to 4 people'));
    });

    it('uses the singular when it reached exactly one person', async () => {
        notificationsService.sendAnnouncement.mockResolvedValueOnce({ recipients: 1 });
        setup();
        typeIn(/title/i, 'Notice');
        typeIn(/message/i, 'Body');

        fireEvent.click(screen.getByRole('button', { name: /^send$/i }));

        await waitFor(() => expect(notify.success).toHaveBeenCalledWith('Announcement sent to 1 person'));
    });

    it('validates before sending anything', async () => {
        setup();
        fireEvent.click(screen.getByRole('button', { name: /^send$/i }));

        expect(await screen.findByText('A title is required')).toBeInTheDocument();
        expect(screen.getByText('A message is required')).toBeInTheDocument();
        expect(notificationsService.sendAnnouncement).not.toHaveBeenCalled();
    });

    it('rejects whitespace-only content', async () => {
        setup();
        typeIn(/title/i, '   ');
        typeIn(/message/i, '   ');

        fireEvent.click(screen.getByRole('button', { name: /^send$/i }));

        expect(await screen.findByText('A title is required')).toBeInTheDocument();
        expect(notificationsService.sendAnnouncement).not.toHaveBeenCalled();
    });

    it('surfaces the server error and keeps the dialog open so the text is not lost', async () => {
        notificationsService.sendAnnouncement.mockRejectedValueOnce({
            response: { data: { message: 'No users match the selected recipients' } },
        });
        const { onClose } = setup();
        typeIn(/title/i, 'Notice');
        typeIn(/message/i, 'Body');

        fireEvent.click(screen.getByRole('button', { name: /^send$/i }));

        await waitFor(() => expect(notify.error).toHaveBeenCalledWith('No users match the selected recipients'));
        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByLabelText(/title/i)).toHaveValue('Notice');
    });

    it('clears the composer between sends', async () => {
        const { onClose } = setup();
        typeIn(/title/i, 'First');
        typeIn(/message/i, 'Body');
        fireEvent.click(screen.getByRole('button', { name: /^send$/i }));

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(screen.getByLabelText(/title/i)).toHaveValue('');
    });
});
