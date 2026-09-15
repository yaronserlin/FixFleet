// src/pages/AdminDashboard.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminDashboard from './AdminDashboard';
import adminService from '../services/adminService';
import { useTool } from '../contexts/ToolContext';
import { useNotify } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';

jest.mock('../services/adminService', () => ({
    __esModule: true,
    default: {
        getUsers: jest.fn(),
        createUser: jest.fn(),
        deleteUser: jest.fn(),
        updateUserRole: jest.fn(),
    },
}));

jest.mock('../contexts/ToolContext', () => ({ __esModule: true, useTool: jest.fn() }));
jest.mock('../contexts/NotificationContext', () => ({ __esModule: true, useNotify: jest.fn() }));
jest.mock('../contexts/AuthContext', () => ({ __esModule: true, useAuth: jest.fn() }));

// Isolate AdminDashboard's own fetching/handler logic from the (heavy) real
// panels — each stub exposes the props it received via buttons/text so tests
// can drive and assert the page's callbacks directly.
jest.mock('../components/User/UserPanel/UserPanel', () => (props) => (
    <div data-testid="user-panel">
        <span data-testid="user-count">{props.users.length}</span>
        <span data-testid="user-error">{props.error ? 'has-error' : 'no-error'}</span>
        <span data-testid="user-loading">{String(props.loading)}</span>
        <button onClick={() => props.onCreate({ name: 'New User' })}>create-user</button>
        <button onClick={() => props.onDelete('u1')}>delete-user</button>
        <button onClick={() => props.onRoleChange('u1', 'admin').catch(() => {})}>change-role-self</button>
        <button onClick={() => props.onRoleChange('u2', 'mechanic').catch(() => {})}>change-role-other</button>
    </div>
));

jest.mock('../components/Tool/ToolsPanel/ToolsPanel', () => (props) => (
    <div data-testid="tools-panel">
        <span data-testid="tool-count">{props.tools.length}</span>
        <button onClick={() => props.onCreate({ name: 'Drill' })}>create-tool</button>
        <button onClick={() => props.onUpdate('t1', { name: 'Drill v2' })}>update-tool</button>
        <button onClick={() => props.onDelete('t1')}>delete-tool</button>
    </div>
));

const notify = { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() };

function mockToolContext(overrides = {}) {
    useTool.mockReturnValue({
        tools: [{ _id: 't1', name: 'Drill' }],
        loading: false,
        error: null,
        createTool: jest.fn().mockResolvedValue({ _id: 'new-tool' }),
        updateTool: jest.fn().mockResolvedValue({ _id: 't1' }),
        deleteTool: jest.fn().mockResolvedValue(undefined),
        ...overrides,
    });
}

describe('AdminDashboard', () => {
    let consoleErrorSpy;

    beforeEach(() => {
        jest.clearAllMocks();
        useNotify.mockReturnValue(notify);
        useAuth.mockReturnValue({ user: { id: 'u1', role: 'admin' }, setUser: jest.fn() });
        mockToolContext();
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    it('shows a loading skeleton before the initial user fetch resolves', () => {
        adminService.getUsers.mockReturnValueOnce(new Promise(() => {})); // never resolves
        render(<AdminDashboard />);
        // The skeleton stands in for the whole page, panels included, and
        // carries the accessible name the old spinner's caption used to.
        expect(screen.getByRole('status', { name: /loading system administration/i })).toBeInTheDocument();
        expect(screen.queryByTestId('user-panel')).not.toBeInTheDocument();
        expect(screen.queryByTestId('tools-panel')).not.toBeInTheDocument();
    });

    it('renders the header stat chips and panels once users have loaded', async () => {
        adminService.getUsers.mockResolvedValueOnce([{ _id: 'u1', name: 'Jane' }, { _id: 'u2', name: 'Bob' }]);
        render(<AdminDashboard />);
        expect(await screen.findByText('2 Active Users')).toBeInTheDocument();
        expect(screen.getByText('1 Equipment Registered')).toBeInTheDocument();
        expect(screen.getByTestId('user-panel')).toBeInTheDocument();
        expect(screen.getByTestId('tools-panel')).toBeInTheDocument();
    });

    it('uses singular wording for exactly one user', async () => {
        adminService.getUsers.mockResolvedValueOnce([{ _id: 'u1', name: 'Jane' }]);
        render(<AdminDashboard />);
        expect(await screen.findByText('1 Active User')).toBeInTheDocument();
    });

    it('passes a user-fetch error down to UserPanel', async () => {
        adminService.getUsers.mockRejectedValueOnce(new Error('network down'));
        render(<AdminDashboard />);
        await waitFor(() => expect(screen.getByTestId('user-error').textContent).toBe('has-error'));
    });

    describe('user handlers', () => {
        beforeEach(() => {
            adminService.getUsers.mockResolvedValue([{ _id: 'u1', name: 'Jane' }]);
        });

        it('creates a user, appends it, and notifies success', async () => {
            adminService.createUser.mockResolvedValueOnce({ _id: 'u3', name: 'New User' });
            render(<AdminDashboard />);
            await screen.findByTestId('user-panel');
            fireEvent.click(screen.getByText('create-user'));
            await waitFor(() => expect(screen.getByTestId('user-count').textContent).toBe('2'));
            expect(notify.success).toHaveBeenCalledWith('User created successfully');
        });

        it('notifies an error when user creation fails', async () => {
            adminService.createUser.mockRejectedValueOnce(new Error('boom'));
            render(<AdminDashboard />);
            await screen.findByTestId('user-panel');
            fireEvent.click(screen.getByText('create-user'));
            await waitFor(() => expect(notify.error).toHaveBeenCalledWith('Failed to create user'));
        });

        it('deletes a user, removes it, and notifies success', async () => {
            adminService.getUsers.mockResolvedValue([{ _id: 'u1', name: 'Jane' }, { _id: 'u2', name: 'Bob' }]);
            adminService.deleteUser.mockResolvedValueOnce(undefined);
            render(<AdminDashboard />);
            await waitFor(() => expect(screen.getByTestId('user-count').textContent).toBe('2'));
            fireEvent.click(screen.getByText('delete-user'));
            await waitFor(() => expect(screen.getByTestId('user-count').textContent).toBe('1'));
            expect(notify.success).toHaveBeenCalledWith('User deleted');
        });

        it('changes another user\'s role without touching the logged-in user\'s own session', async () => {
            const setUser = jest.fn();
            useAuth.mockReturnValue({ user: { id: 'u1', role: 'admin' }, setUser });
            adminService.updateUserRole.mockResolvedValueOnce({ _id: 'u2', role: 'mechanic' });
            render(<AdminDashboard />);
            await screen.findByTestId('user-panel');
            fireEvent.click(screen.getByText('change-role-other'));
            await waitFor(() => expect(notify.success).toHaveBeenCalledWith('User role updated to mechanic successfully'));
            expect(setUser).not.toHaveBeenCalled();
        });

        it('updates the logged-in user\'s own session when they change their own role', async () => {
            const setUser = jest.fn();
            useAuth.mockReturnValue({ user: { id: 'u1', role: 'admin' }, setUser });
            adminService.updateUserRole.mockResolvedValueOnce({ _id: 'u1', role: 'admin' });
            render(<AdminDashboard />);
            await screen.findByTestId('user-panel');
            fireEvent.click(screen.getByText('change-role-self'));
            await waitFor(() => expect(setUser).toHaveBeenCalled());
        });

        it('notifies a server-provided error message and rethrows on role-change failure', async () => {
            adminService.updateUserRole.mockRejectedValueOnce({ response: { data: { message: 'Not allowed' } } });
            render(<AdminDashboard />);
            await screen.findByTestId('user-panel');
            fireEvent.click(screen.getByText('change-role-other'));
            await waitFor(() => expect(notify.error).toHaveBeenCalledWith('Not allowed'));
        });
    });

    describe('tool handlers (forwarded to EquipmentContext via useTool)', () => {
        beforeEach(() => {
            adminService.getUsers.mockResolvedValue([{ _id: 'u1', name: 'Jane' }]);
        });

        it('forwards create/update/delete tool actions to the context', async () => {
            const createTool = jest.fn().mockResolvedValue({});
            const updateTool = jest.fn().mockResolvedValue({});
            const deleteTool = jest.fn().mockResolvedValue({});
            mockToolContext({ createTool, updateTool, deleteTool });
            render(<AdminDashboard />);
            await screen.findByTestId('tools-panel');

            fireEvent.click(screen.getByText('create-tool'));
            await waitFor(() => expect(createTool).toHaveBeenCalledWith({ name: 'Drill' }));

            fireEvent.click(screen.getByText('update-tool'));
            await waitFor(() => expect(updateTool).toHaveBeenCalledWith('t1', { name: 'Drill v2' }));

            fireEvent.click(screen.getByText('delete-tool'));
            await waitFor(() => expect(deleteTool).toHaveBeenCalledWith('t1'));
        });
    });
});
