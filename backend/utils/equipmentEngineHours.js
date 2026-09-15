// backend/utils/equipmentEngineHours.js
const mongoose = require('mongoose');
const { SCHEDULE_STATUS, DUE_SOON_THRESHOLD_HOURS } = require('../constants/scheduleStatus');

/**
 * Synchronizes an equipment's currentEngineHours to the highest recorded value among:
 * 1. All closed/resolved faults for this equipment (closingEngineHours and engineHours)
 * 2. All maintenance/service records for this equipment (engineHours)
 * 3. Any additional candidate reading passed in (e.g. validHours from a current completion/resolution)
 * 4. Existing equipment currentEngineHours
 *
 * Also recalculates the status (overdue, due_soon, normal) of all scheduled maintenance routines.
 *
 * @param {string|mongoose.Types.ObjectId} toolId
 * @param {string|mongoose.Types.ObjectId} companyId
 * @param {number|null} [additionalCandidate=null]
 * @returns {Promise<Object|null>} Updated equipment document
 */
async function syncEquipmentEngineHours(toolId, companyId, additionalCandidate = null) {
    if (!toolId || !companyId) return null;

    const Equipment = mongoose.models.Equipment || mongoose.model('Equipment');
    const Fault = mongoose.models.Fault || mongoose.model('Fault');
    const Maintenance = mongoose.models.Maintenance || mongoose.model('Maintenance');

    const tool = await Equipment.findOne({ _id: toolId, companyId });
    if (!tool) return null;

    // Fetch closed faults for this equipment
    const closedFaults = await Fault.find({
        tool: toolId,
        companyId,
        status: 'closed',
    }).select('closingEngineHours').lean();

    // Fetch maintenance service logs for this equipment
    const maintenances = await Maintenance.find({
        tool: toolId,
        companyId,
    }).select('engineHours').lean();

    let highestHours = typeof tool.currentEngineHours === 'number' && !isNaN(tool.currentEngineHours)
        ? tool.currentEngineHours
        : 0;

    for (const f of closedFaults) {
        if (typeof f.closingEngineHours === 'number' && !isNaN(f.closingEngineHours) && f.closingEngineHours > 0) {
            highestHours = Math.max(highestHours, f.closingEngineHours);
        }
    }

    for (const m of maintenances) {
        if (typeof m.engineHours === 'number' && !isNaN(m.engineHours) && m.engineHours > 0) {
            highestHours = Math.max(highestHours, m.engineHours);
        }
    }

    if (typeof additionalCandidate === 'number' && !isNaN(additionalCandidate) && additionalCandidate > 0) {
        highestHours = Math.max(highestHours, additionalCandidate);
    }

    tool.currentEngineHours = highestHours;

    // Recalculate maintenance schedule statuses based on updated engine hours
    if (tool.maintenanceSchedule && tool.maintenanceSchedule.length > 0) {
        tool.maintenanceSchedule.forEach(task => {
            if (task.intervalHours > 0) {
                const nextDue = task.nextDueHours || ((task.lastPerformedHours || 0) + task.intervalHours);
                const remainingHours = nextDue - tool.currentEngineHours;
                if (remainingHours <= 0) {
                    task.status = SCHEDULE_STATUS.OVERDUE;
                } else if (remainingHours <= DUE_SOON_THRESHOLD_HOURS) {
                    task.status = SCHEDULE_STATUS.DUE_SOON;
                } else {
                    task.status = SCHEDULE_STATUS.NORMAL;
                }
            }
        });
        tool.markModified('maintenanceSchedule');
    }

    await tool.save();
    return tool;
}

module.exports = {
    syncEquipmentEngineHours,
};
