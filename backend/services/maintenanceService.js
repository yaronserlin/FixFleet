// services/maintenanceService.js
const Maintenance = require('../models/Maintenance');
const Tool = require('../models/Tool');
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
 * Fetches a single maintenance record within a company.
 *
 * @param {string} companyId - Tenant scope.
 * @param {string} recordId - The maintenance record's ObjectId.
 * @throws {Error & { status: number }} 404 if not found in this company.
 * @returns {Promise<Object>} The maintenance record, populated with tool and mechanic.
 */
async function getMaintenanceById(companyId, recordId) {
    const record = await Maintenance.findOne({ _id: recordId, companyId })
        .populate('tool')
        .populate('mechanic', 'name email');

    if (!record) {
        throw httpError(404, 'Maintenance record not found');
    }
    return record;
}

/**
 * Creates a maintenance log entry for a tool within a company, then
 * synchronizes the tool's currentEngineHours to the highest known reading.
 *
 * @param {string} companyId - Tenant scope for the new record and for the referenced tool lookup.
 * @param {string} userId - The mechanic/admin performing the maintenance (stored as `mechanic`).
 * @param {{ tool?: string, details?: string, date?: string, engineHours?: string|number }} body - Raw request body.
 * @throws {Error & { status: number }} 400 if details/tool are missing or the tool doesn't belong to this company.
 * @returns {Promise<Object>} The created, populated maintenance record.
 */
async function createMaintenance(companyId, userId, body) {
    if (!body || typeof body !== 'object') {
        throw httpError(400, 'No data provided');
    }

    const { tool: toolId, details, date, engineHours } = body;

    if (!details || typeof details !== 'string' || details.trim().length === 0) {
        throw httpError(400, 'Maintenance details are required');
    }

    if (!toolId) {
        throw httpError(400, 'Tool reference is required');
    }

    const tool = await Tool.findOne({ _id: toolId, companyId });
    if (!tool) {
        throw httpError(400, 'Referenced tool does not exist in your organization');
    }

    const parsedHours = engineHours !== undefined && engineHours !== '' && engineHours !== null ? parseFloat(engineHours) : null;
    const validHours = parsedHours !== null && !isNaN(parsedHours) && parsedHours >= 0 ? parsedHours : null;

    const maintenancePayload = {
        tool: tool._id,
        mechanic: userId,
        details: details.trim(),
        date: date ? new Date(date) : new Date(),
        companyId,
    };
    if (validHours !== null) {
        maintenancePayload.engineHours = validHours;
    }

    const maintenance = await Maintenance.create(maintenancePayload);

    // Update equipment engine hours to highest reading across resolved faults or services
    await syncEquipmentEngineHours(tool._id, companyId, validHours);

    return Maintenance.findById(maintenance._id)
        .populate('tool', 'name serialNumber model currentEngineHours')
        .populate('mechanic', 'name email');
}

/**
 * Deletes a maintenance record within a company, then re-syncs the
 * associated tool's currentEngineHours (which may drop if this record
 * held the highest reading).
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
        await syncEquipmentEngineHours(record.tool, companyId);
    }
}

module.exports = {
    getAllMaintenance,
    getMaintenanceById,
    createMaintenance,
    deleteMaintenance,
};
