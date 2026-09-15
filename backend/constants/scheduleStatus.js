// constants/scheduleStatus.js

/**
 * Maintenance schedule task statuses, matching the `status` enum on
 * Equipment.maintenanceSchedule (see models/Equipment.js). Derived from how
 * far a task's next-due engine hours are from the equipment's current
 * reading (see utils/equipmentEngineHours.js).
 *
 * @type {{ NORMAL: 'normal', DUE_SOON: 'due_soon', OVERDUE: 'overdue' }}
 */
const SCHEDULE_STATUS = Object.freeze({
    NORMAL: 'normal',
    DUE_SOON: 'due_soon',
    OVERDUE: 'overdue',
});

/** All valid maintenance schedule status values. @type {string[]} */
const ALL_SCHEDULE_STATUSES = Object.freeze([
    SCHEDULE_STATUS.NORMAL,
    SCHEDULE_STATUS.DUE_SOON,
    SCHEDULE_STATUS.OVERDUE,
]);

/**
 * A schedule task is considered "due soon" once its remaining engine hours
 * (next-due hours minus the equipment's current reading) fall to or below
 * this threshold, but are still above zero. See
 * utils/equipmentEngineHours.js's `syncEquipmentEngineHours`.
 * @type {number}
 */
const DUE_SOON_THRESHOLD_HOURS = 20;

module.exports = { SCHEDULE_STATUS, ALL_SCHEDULE_STATUSES, DUE_SOON_THRESHOLD_HOURS };
