// src/services/userService.js
import apiClient from './apiClient';

/**
 * Service for user-related API calls: fetching/updating profile and changing password
 */
const userService = {
    /**
     * Retrieve the current user's profile
     * @returns {Promise} Axios response with user data
     */
    getProfile: () => apiClient.get('/auth/me'),

    /**
     * Update the current user's name and email
     * @param {{name: string, email: string}} data
     * @returns {Promise} Axios response with updated user data
     */
    updateProfile: (data) => apiClient.put('/auth/me', data),

    deleteAccount: (confirmation) => apiClient.delete('/auth/me', { data: { confirmation } }),

    /**
     * Change the current user's password
     * @param {{currentPassword: string, newPassword: string}} payload
     * @returns {Promise} Axios response
     */
    changePassword: (payload) => apiClient.post('/auth/me/change-password', payload),

    /**
     * Request a password reset link by email (always succeeds for a valid email)
     * @param {string} email
     * @returns {Promise} Axios response
     */
    forgotPassword: (email) => apiClient.post('/auth/forgot-password', { email }),

    /**
     * Set a new password using the token from a reset link
     * @param {string} token
     * @param {string} newPassword
     * @returns {Promise} Axios response
     */
    resetPassword: (token, newPassword) => apiClient.post('/auth/reset-password', { token, newPassword }),

    /**
     * Upload an avatar image for the current user
     * @param {File} file
     * @returns {Promise} Axios response with updated user data
     */
    uploadAvatar: (file) => {
        const formData = new FormData();
        formData.append('avatar', file);
        return apiClient.post('/auth/me/avatar', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
};

export default userService;
