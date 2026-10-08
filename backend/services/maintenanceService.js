// services/maintenanceService.js
const Maintenance = require('../models/Maintenance');
const { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } = require('../constants/pagination');
const { syncEquipmentEngineHours } = require('../utils/equipmentEngineHours');
const { httpError } = require('../utils/httpError');

/**
 * Lists maintenance logs for a company, optionally filtered by tool and
 * paginated.
 *
 * @param {string} companyId - Tenant scope; only logs for this company are returned.
 * @param {{ page?: string|number, limit?: string|number, toolId?: string }} [query] - Raw query params.
 * @returns {Promise<Array<Object>|{ logs: Array<Object>, page: number, limit: number, total: number, pages: number }>}
 *   A plain array when no pagination params are given, otherwise a paginated envelope.
 */
async function getAllMaintenance(companyId, query = {}) {
    const { page, limit, toolId } = query;
    const filter = { companyId };
    if (toolId) {
        filter.tool = toolId;
    }

    if (page || limit) {
        const pageNum = Math.max(1, parseInt(page, 10) || DEFAULT_PAGE);
        const limitNum = Math.max(1, Math.min(MAX_LIMIT, parseInt(limit, 10) || DEFAULT_LIMIT));
        const skip = (pageNum - 1) * limitNum;

        const [logs, total] = await Promise.all([
            Maintenance.find(filter)
                .populate('tool', 'name serialNumber model')
                .populate('mechanic', 'name email')
                .sort({ date: -1 })
                .skip(skip)
                .limit(limitNum),
            Maintenance.countDocuments(filter),
        ]);

        return {
            logs,
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
        };
    }

    return Maintenance.find(filter)
        .populate('tool', 'name serialNumber model')
        .populate('mechanic', 'name email')
        .sort({ date: -1 });
}

/**
 * Deletes a maintenance record within a company, then re-syncs the
 * associated tool's currentEngineHours (which drops to the highest
 * remaining reading if this record's reading was the current one).
 *
 * @param {string} companyId - Tenant scope.
 * @param {string} recordId - The maintenance record's ObjectId.
 * @throws {Error & { status: number }} 404 if not found in this company.
 * @returns {Promise<void>}
 */
async function deleteMaintenance(companyId, recordId) {
    const record = await Maintenance.findOneAndDelete({ _id: recordId, companyId });

    if (!record) {
        throw httpError(404, 'Maintenance record not found');
    }

    if (record.tool) {
        await syncEquipmentEngineHours(record.tool, companyId, null, record.engineHours);
    }
}

module.exports = {
    getAllMaintenance,
    deleteMaintenance,
};
