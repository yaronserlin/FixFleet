// src/pages/SuperAdminDashboard.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import SuperAdminDashboard from './SuperAdminDashboard';
import superadminService from '../services/superadminService';
import { useNotify } from '../contexts/NotificationContext';

jest.mock('../services/superadminService', () => ({
    __esModule: true,
    default: {
        getStats: jest.fn(),
        getCompanies: jest.fn(),
        getCompany: jest.fn(),
        setCompanyActive: jest.fn(),
        getUsers: jest.fn(),
        updateUserRole: jest.fn(),
        resetUserPassword: jest.fn(),
        deleteUser: jest.fn(),
        sendAnnouncement: jest.fn(),
        getAuditLogs: jest.fn(),
    },
}));
jest.mock('../contexts/NotificationContext', () => ({ __esModule: true, useNotify: jest.fn() }));

// recharts needs ResizeObserver/real layout, which jsdom lacks.
jest.mock('recharts', () => ({
    ResponsiveContainer: ({ children }) => <div data-testid="chart">{children}</div>,
    AreaChart: ({ children }) => <div>{children}</div>,
    BarChart: ({ children }) => <div>{children}</div>,
    Area: () => null,
    Bar: () => null,
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: () => null,
    CartesianGrid: () => null,
}));

// Sections are routes now (driven by the sidebar), so render at a URL.
const renderAt = (path = '/superadmin') => render(
    <MemoryRouter initialEntries={[path]}>
        <Routes>
            <Route path="/superadmin/:tab?" element={<SuperAdminDashboard />} />
        </Routes>
    </MemoryRouter>
);

const notify = { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() };

const month = (m, count) => ({ month: m, count });
const STATS = {
    totals: {
        companies: 2, activeCompanies: 1, newCompaniesThisMonth: 1,
        users: 7, newUsersThisMonth: 3, activeUsers: 5,
        storageBytes: 3 * 1024 * 1024, storedFiles: 12,
    },
    activeWindowDays: 30,
    companiesPerMonth: [month('2026-09', 1), month('2026-10', 1)],
    usersPerMonth: [month('2026-09', 4), month('2026-10', 3)],
    largestCompanies: [{ companyId: 'c1', name: 'Alpha Farms', users: 4 }],
    attention: { inactiveCompanies: 1, dormantCompanies: 1, dormantSample: [{ _id: 'c1', name: 'Alpha Farms', lastActiveAt: null }] },
};
const AUDIT = {
    logs: [
        {
            _id: 'a1',
            action: 'user.role_changed',
            actor: { name: 'Megan Carter', email: 'megan@alpha.test', role: 'admin' },
            target: { type: 'user', id: 'u1', label: 'tom@alpha.test' },
            metadata: { from: 'mechanic', to: 'admin' },
            companyId: { _id: 'c1', name: 'Alpha Farms' },
            ip: '10.0.0.7',
            createdAt: '2026-10-07T09:00:00Z',
        },
        {
            _id: 'a2',
            action: 'auth.login_failed',
            actor: null,
            target: null,
            metadata: { email: 'intruder@example.com' },
            companyId: null,
            ip: '10.0.0.9',
            createdAt: '2026-10-07T08:00:00Z',
        },
    ],
    total: 2,
    page: 1,
    limit: 20,
    pages: 1,
};
const COMPANIES = [
    { _id: 'c1', name: 'Alpha Farms', slug: 'alpha', isActive: true, userCount: 4, lastActiveAt: null, createdAt: '2026-09-01T00:00:00Z' },
    { _id: 'c2', name: 'Beta Farms', slug: 'beta', isActive: false, userCount: 3, lastActiveAt: '2026-10-01T00:00:00Z', createdAt: '2026-10-01T00:00:00Z' },
];

beforeEach(() => {
    jest.clearAllMocks();
    useNotify.mockReturnValue(notify);
    superadminService.getStats.mockResolvedValue(STATS);
    superadminService.getCompanies.mockResolvedValue(COMPANIES);
    superadminService.getUsers.mockResolvedValue({
        users: [{ _id: 'u1', name: 'Tom Mechanic', email: 'tom@alpha.test', role: 'mechanic', lastActiveAt: null, companyId: { _id: 'c1', name: 'Alpha Farms', isActive: true } }],
        total: 1,
        page: 1,
        limit: 20,
        pages: 1,
    });
    superadminService.setCompanyActive.mockResolvedValue({});
    superadminService.getAuditLogs.mockResolvedValue(AUDIT);
});

describe('SuperAdminDashboard', () => {
    it('renders platform KPIs, not tenant operations', async () => {
        renderAt();
        expect(await screen.findByText('Platform Administration')).toBeInTheDocument();
        expect(screen.getByText('1 active · 1 new this month')).toBeInTheDocument();
        expect(screen.getByText('71% signed in within 30 days')).toBeInTheDocument();
        expect(screen.getByText('3.0 MB')).toBeInTheDocument();
        expect(screen.queryByText(/fault/i)).not.toBeInTheDocument();
    });

    it('shows platform health issues and recent audit activity', async () => {
        renderAt();
        expect(await screen.findByText('1 deactivated company')).toBeInTheDocument();
        expect(screen.getByText('No sign-ins in 30 days: Alpha Farms')).toBeInTheDocument();
        expect(await screen.findByText("Megan Carter changed tom@alpha.test's role from mechanic to admin")).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'View all' }));
        expect(await screen.findByRole('combobox', { name: 'Filter by event' })).toBeInTheDocument();
    });

    it('lists and filters the audit log', async () => {
        renderAt('/superadmin/audit');

        expect(await screen.findByText('Failed sign-in for intruder@example.com')).toBeInTheDocument();
        expect(screen.getByText('10.0.0.7')).toBeInTheDocument();
        expect(screen.getByText('by megan@alpha.test (admin)')).toBeInTheDocument();

        fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Filter by event' }));
        fireEvent.click(screen.getByRole('option', { name: 'Failed sign-in' }));
        await waitFor(() => expect(superadminService.getAuditLogs).toHaveBeenLastCalledWith(
            expect.objectContaining({ action: 'auth.login_failed', page: 1 })
        ));
    });

    it('lists companies and asks for confirmation before deactivating one', async () => {
        renderAt('/superadmin/companies');

        fireEvent.click(await screen.findByRole('switch', { name: 'Deactivate Alpha Farms' }));
        expect(superadminService.setCompanyActive).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }));
        await waitFor(() => expect(superadminService.setCompanyActive).toHaveBeenCalledWith('c1', false));
    });

    it('reactivates a company without a confirmation', async () => {
        renderAt('/superadmin/companies');
        fireEvent.click(await screen.findByRole('switch', { name: 'Activate Beta Farms' }));
        await waitFor(() => expect(superadminService.setCompanyActive).toHaveBeenCalledWith('c2', true));
    });

    it('shows a reset password once after confirmation', async () => {
        superadminService.resetUserPassword.mockResolvedValue({ temporaryPassword: 'tmp-Secret-123' });
        renderAt('/superadmin/users');

        fireEvent.click(await screen.findByRole('button', { name: 'Reset password for Tom Mechanic' }));
        fireEvent.click(screen.getByRole('button', { name: 'Reset' }));

        expect(await screen.findByDisplayValue('tmp-Secret-123')).toBeInTheDocument();
        expect(superadminService.resetUserPassword).toHaveBeenCalledWith('u1');
    });

    it('opens audit event details when a row is clicked', async () => {
        renderAt('/superadmin/audit');
        fireEvent.click(await screen.findByRole('button', { name: 'View Failed sign-in event details' }));
        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByText('10.0.0.9')).toBeInTheDocument();
        expect(within(dialog).getByText(/intruder@example.com/, { selector: 'pre' })).toBeInTheDocument();
    });

    it("opens a user's company when their row is clicked, but not from the row's controls", async () => {
        superadminService.getCompany.mockResolvedValue({ company: { name: 'Alpha Farms' }, users: [] });
        renderAt('/superadmin/users');
        fireEvent.click(await screen.findByRole('button', { name: 'Reset password for Tom Mechanic' }));
        expect(superadminService.getCompany).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

        fireEvent.click(await screen.findByRole('button', { name: "View Tom Mechanic's company" }));
        await waitFor(() => expect(superadminService.getCompany).toHaveBeenCalledWith('c1'));
    });

    it('seeds the users search from the URL', async () => {
        renderAt('/superadmin/users?search=tom%40alpha.test');
        expect(await screen.findByDisplayValue('tom@alpha.test')).toBeInTheDocument();
        await waitFor(() => expect(superadminService.getUsers).toHaveBeenLastCalledWith(
            expect.objectContaining({ search: 'tom@alpha.test' })
        ));
    });

    it('surfaces a load failure', async () => {
        superadminService.getStats.mockRejectedValue({ response: { data: { message: 'boom' } } });
        renderAt();
        await waitFor(() => expect(notify.error).toHaveBeenCalledWith('boom'));
    });
});
