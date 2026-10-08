// src/services/maintenanceService.js
import apiClient from './apiClient';

/**
 * Service for fetching and managing equipment maintenance records & logs
 */
const maintenanceService = {
    /**
     * Get maintenance logs, optionally filtered by toolId or pagination
     * @param {Object} params - e.g. { toolId, page, limit }
     */
    getMaintenance: (params = {}) =>
        apiClient
            .get('/maintenance', { params })
            .then((res) => res.data),

    /**
     * Delete a maintenance record
     * @param {string} id
     */
    deleteMaintenance: (id) =>
        apiClient
            .delete(`/maintenance/${id}`)
            .then((res) => res.data),
};

export default maintenanceService;
