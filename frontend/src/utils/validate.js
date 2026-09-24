// src/utils/validate.js
import { ALL_ROLES } from '../constants/roles';

/**
 * Check that a value is not empty.
 * @param {string|any[]} value
 * @param {string} fieldName
 * @returns {string} error message or empty string
 */
export function isRequired(value, fieldName = 'This field') {
    if (
        value === undefined ||
        value === null ||
        (typeof value === 'string' && value.trim() === '') ||
        (Array.isArray(value) && value.length === 0)
    ) {
        return `${fieldName} is required.`;
    }
    return '';
}

/**
 * Validate an email address.
 * @param {string} email
 * @returns {string} error message or empty string
 */
export function validateEmail(email) {
    let err = isRequired(email, 'Email');
    if (err) return err;

    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email)
        ? ''
        : 'Please enter a valid email address.';
}

/**
 * Validate password strength:
 * - at least 8 chars
 * @param {string} pwd
 * @returns {string} error message or empty string
 */
export function validatePassword(pwd) {
    let err = isRequired(pwd, 'Password');
    if (err) return err;

    if (pwd.length < 8) {
        return 'Password must be at least 8 characters.';
    }
    return '';
}

export function validateName(name) {
    let err = isRequired(name, 'Name');
    if (err) return err;

    const pattern = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/;
    return pattern.test(name)
        ? ''
        : 'Name can only contain letters, spaces, hyphens, and apostrophes.';
}

/**
 * Role can be: admin, operator, mechanic
 * @param {string} role 
 */
export function validateRole(role) {
    let err = isRequired(role, 'Role');
    if (err) return err;

    return ALL_ROLES.includes(role)
        ? ''
        : `Role must be one of: ${ALL_ROLES.join(', ')}.`;
}

/**
 * Generic min-length check for arbitrary fields.
 * @param {string} value
 * @param {number} min
 * @param {string} fieldName
 * @returns {string}
 */
export function validateMinLength(value, min, fieldName = 'This field') {
    if (typeof value === 'string' && value.trim().length > 0 && value.length < min) {
        return `${fieldName} must be at least ${min} characters.`;
    }
    return '';
}
