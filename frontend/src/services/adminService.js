// src/services/adminService.js
import apiClient from './apiClient';

const adminService = {
    // ── Users ────────────────────────────────────────────────────────────────

    /** GET  /api/admin/users */
    getUsers: async () => {
        const res = await apiClient.get('/admin/users');
        return res.data;
    },

    /** POST /api/admin/users
     *  body: { name, email, password, role }
     */
    createUser: async (userData) => {
        const res = await apiClient.post('/admin/users', userData);
        return res.data;
    },

    /** PATCH /api/admin/users/:id/role
     *  body: { role }
     */
    updateUserRole: async (userId, newRole) => {
        const res = await apiClient.patch(`/admin/users/${userId}/role`, { role: newRole });
        return res.data;
    },

    /** DELETE /api/admin/users/:id */
    deleteUser: async (userId) => {
        await apiClient.delete(`/admin/users/${userId}`);
    },
};

export default adminService;
