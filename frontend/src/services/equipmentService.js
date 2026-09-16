// src/services/equipmentService.js
import apiClient from './apiClient';

const equipmentService = {
    /**
     * Fetch all equipment
     * @returns {Promise<Array>} Array of equipment objects
     */
    getAll: () =>
        apiClient
            .get('/equipment')
            .then(res => res.data),

    /**
     * Fetch a single equipment item by its ID
     * @param {string|number} id - Equipment unique identifier
     * @returns {Promise<Object>} The equipment object
     */
    getById: (id) =>
        apiClient
            .get(`/equipment/${id}`)
            .then(res => res.data),

    /**
     * Create a new equipment entry
     * @param {Object} payload - { name, model, serialNumber, details… }
     * @returns {Promise<Object>} The created equipment
     */
    create: payload =>
        apiClient
            .post('/equipment', payload)
            .then(res => res.data),

    /**
     * Update an existing equipment
     * @param {string|number} id - Equipment ID
     * @param {Object} payload - Fields to update
     * @returns {Promise<Object>} The updated equipment
     */
    update: (id, payload) =>
        apiClient
            .put(`/equipment/${id}`, payload)
            .then(res => res.data),

    /**
     * Delete an equipment item by its ID
     * @param {string|number} id - Equipment ID
     * @returns {Promise<void>}
     */
    delete: id =>
        apiClient
            .delete(`/equipment/${id}`)
            .then(res => res.data),

    /**
     * Upload a PDF manual/book for equipment.
     * `onUploadProgress` (axios progress event -> void) drives a progress
     * indicator; the extended timeout is so a stalled connection eventually
     * surfaces an error instead of leaving the caller waiting forever (axios
     * has no timeout by default).
     */
    uploadBook: (id, formData, { onUploadProgress } = {}) =>
        apiClient
            .post(`/equipment/${id}/books`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 3 * 60 * 1000,
                onUploadProgress,
            })
            .then(res => res.data),

    /**
     * Delete a book/manual
     */
    deleteBook: (id, bookId) =>
        apiClient
            .delete(`/equipment/${id}/books/${bookId}`)
            .then(res => res.data),

    /**
     * Add a scheduled maintenance task
     */
    addSchedule: (id, payload) =>
        apiClient
            .post(`/equipment/${id}/schedules`, payload)
            .then(res => res.data),

    /**
     * Delete a scheduled maintenance task
     */
    deleteSchedule: (id, scheduleId) =>
        apiClient
            .delete(`/equipment/${id}/schedules/${scheduleId}`)
            .then(res => res.data),

    /**
     * Complete a scheduled maintenance task
     */
    completeSchedule: (id, scheduleId, payload) =>
        apiClient
            .post(`/equipment/${id}/schedules/${scheduleId}/complete`, payload)
            .then(res => res.data),

    /**
     * Get a specific schedule with checklist
     */
    getSchedule: (id, scheduleId) =>
        apiClient
            .get(`/equipment/${id}/schedules/${scheduleId}`)
            .then(res => res.data),

    /**
     * Add a checklist item (todo) to a schedule
     */
    addChecklistItem: (id, scheduleId, text) =>
        apiClient
            .post(`/equipment/${id}/schedules/${scheduleId}/checklist`, { text })
            .then(res => res.data),

    /**
     * Toggle a checklist item (done/undone)
     */
    toggleChecklistItem: (id, scheduleId, itemId) =>
        apiClient
            .patch(`/equipment/${id}/schedules/${scheduleId}/checklist/${itemId}`)
            .then(res => res.data),

    /**
     * Delete a checklist item
     */
    deleteChecklistItem: (id, scheduleId, itemId) =>
        apiClient
            .delete(`/equipment/${id}/schedules/${scheduleId}/checklist/${itemId}`)
            .then(res => res.data),

    /**
     * Update in-progress service notes / state
     */
    updateScheduleProgress: async (id, scheduleId, payload) => {
        try {
            const res = await apiClient.patch(`/equipment/${id}/schedules/${scheduleId}/progress`, payload);
            return res.data;
        } catch (err) {
            if (err.response?.status === 404 || err.response?.status === 405) {
                const res = await apiClient.put(`/equipment/${id}/schedules/${scheduleId}/progress`, payload);
                return res.data;
            }
            throw err;
        }
    },
};

export default equipmentService;
