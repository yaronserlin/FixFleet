// src/services/superadminService.js
import apiClient from './apiClient';

const superadminService = {
    /** GET /api/superadmin/stats */
    getStats: async () => {
        const res = await apiClient.get('/superadmin/stats');
        return res.data;
    },

    // ── Companies ────────────────────────────────────────────────────────────

    /** GET /api/superadmin/companies */
    getCompanies: async () => {
        const res = await apiClient.get('/superadmin/companies');
        return res.data;
    },

    /** GET /api/superadmin/companies/:id -> { company, users } */
    getCompany: async (id) => {
        const res = await apiClient.get(`/superadmin/companies/${id}`);
        return res.data;
    },

    /** PATCH /api/superadmin/companies/:id/status  body: { isActive } */
    setCompanyActive: async (id, isActive) => {
        const res = await apiClient.patch(`/superadmin/companies/${id}/status`, { isActive });
        return res.data;
    },

    // ── Users ────────────────────────────────────────────────────────────────

    /** GET /api/superadmin/users?search&companyId&role&page&limit */
    getUsers: async (params) => {
        const res = await apiClient.get('/superadmin/users', { params });
        return res.data;
    },

    /** PATCH /api/superadmin/users/:id/role  body: { role } */
    updateUserRole: async (id, role) => {
        const res = await apiClient.patch(`/superadmin/users/${id}/role`, { role });
        return res.data;
    },

    /** POST /api/superadmin/users/:id/reset-password -> { temporaryPassword } */
    resetUserPassword: async (id) => {
        const res = await apiClient.post(`/superadmin/users/${id}/reset-password`);
        return res.data;
    },

    /** DELETE /api/superadmin/users/:id */
    deleteUser: async (id) => {
        await apiClient.delete(`/superadmin/users/${id}`);
    },

    // ── Audit log ────────────────────────────────────────────────────────────

    /** GET /api/superadmin/audit-logs?action&companyId&search&page&limit */
    getAuditLogs: async (params) => {
        const res = await apiClient.get('/superadmin/audit-logs', { params });
        return res.data;
    },

    // ── Announcements ────────────────────────────────────────────────────────

    /** POST /api/superadmin/announcements  body: { title, body, roles?, companyIds? } */
    sendAnnouncement: async (payload) => {
        const res = await apiClient.post('/superadmin/announcements', payload);
        return res.data;
    },
};

export default superadminService;
