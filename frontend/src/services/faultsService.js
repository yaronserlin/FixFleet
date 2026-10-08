// src/services/faultsService.js
import apiClient from './apiClient';

const faultService = {
    // `params.mine` asks the server for only the caller's own faults.
    getAll: (params) =>
        apiClient.get('/faults', { params })
            .then(res => (Array.isArray(res.data) ? res.data : (res.data.faults || []))),

    getById: (id) =>
        apiClient.get(`/faults/${id}`)
            .then(res => res.data),

    create: (payload) => {
        if (payload instanceof FormData) {
            return apiClient.post('/faults', payload, {
                headers: { 'Content-Type': 'multipart/form-data' },
            }).then(res => res.data);
        }
        if (payload.files && payload.files.length > 0) {
            const formData = new FormData();
            Object.keys(payload).forEach(key => {
                if (key === 'files') {
                    payload.files.forEach(file => formData.append('photos', file));
                } else if (payload[key] !== undefined && payload[key] !== null) {
                    formData.append(key, payload[key]);
                }
            });
            return apiClient.post('/faults', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            }).then(res => res.data);
        }
        return apiClient.post('/faults', payload).then(res => res.data);
    },

    close: (id, payload = {}) =>
        apiClient.patch(`/faults/${id}/close`, payload)
            .then(res => res.data),

    reopen: (id) =>
        apiClient.patch(`/faults/${id}/reopen`)
            .then(res => res.data),

    update: (id, payload) =>
        apiClient.put(`/faults/${id}`, payload)
            .then(res => res.data),

    delete: (id) =>
        apiClient.delete(`/faults/${id}`)
            .then(res => res.data),
};

export default faultService;
