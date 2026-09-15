// src/constants/faultStatus.js

/**
 * Fault lifecycle states, matching the `status` enum on the backend Fault
 * schema (see backend/models/Fault.js and backend/constants/faultStatus.js).
 *
 * @type {{ OPEN: 'open', CLOSED: 'closed' }}
 */
export const FAULT_STATUS = Object.freeze({
    OPEN: 'open',
    CLOSED: 'closed',
});

/** All valid fault status values. @type {string[]} */
export const ALL_FAULT_STATUSES = Object.freeze([FAULT_STATUS.OPEN, FAULT_STATUS.CLOSED]);
