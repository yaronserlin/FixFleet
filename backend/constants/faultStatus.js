// constants/faultStatus.js

/**
 * Fault lifecycle states, matching the `status` enum on the Fault schema
 * (see models/Fault.js).
 *
 * @type {{ OPEN: 'open', CLOSED: 'closed' }}
 */
const FAULT_STATUS = Object.freeze({
    OPEN: 'open',
    CLOSED: 'closed',
});

/** All valid fault status values. @type {string[]} */
const ALL_FAULT_STATUSES = Object.freeze([FAULT_STATUS.OPEN, FAULT_STATUS.CLOSED]);

module.exports = { FAULT_STATUS, ALL_FAULT_STATUSES };
