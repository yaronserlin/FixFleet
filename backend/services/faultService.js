// services/faultService.js
const Fault = require('../models/Fault');
const Tool = require('../models/Tool');
const { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } = require('../constants/pagination');
const { FAULT_STATUS, ALL_FAULT_STATUSES } = require('../constants/faultStatus');
const { syncEquipmentEngineHours } = require('../utils/equipmentEngineHours');
const { httpError } = require('../utils/httpError');
const mediaStorage = require('../utils/mediaStorage');

const FAULT_POPULATE_FIELDS = [
    ['tool', 'name serialNumber model'],
    ['operator', 'name email role'],
    ['resolvedBy', 'name email role'],
];

/**
 * Lists faults for a company, optionally filtered by status and paginated.
 *
 * @param {string} companyId - Tenant scope; only faults for this company are returned.
 * @param {{ page?: string|number, limit?: string|number, status?: string }} [query] - Raw query params.
 * @returns {Promise<Array<Object>|{ faults: Array<Object>, page: number, limit: number, total: number, pages: number }>}
 *   A plain array when no pagination params are given, otherwise a paginated envelope.
 */
async function getAllFaults(companyId, query = {}) {
    const { page, limit, status } = query;
    const filter = { companyId };
    if (status) {
        filter.status = status;
    }

    if (page || limit) {
        const pageNum = Math.max(1, parseInt(page, 10) || DEFAULT_PAGE);
        const limitNum = Math.max(1, Math.min(MAX_LIMIT, parseInt(limit, 10) || DEFAULT_LIMIT));
        const skip = (pageNum - 1) * limitNum;

        let cursor = Fault.find(filter);
        for (const [path, select] of FAULT_POPULATE_FIELDS) cursor = cursor.populate(path, select);
        const [faults, total] = await Promise.all([
            cursor.sort({ createdAt: -1 }).skip(skip).limit(limitNum),
            Fault.countDocuments(filter),
        ]);

        return {
            faults,
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
        };
    }

    let cursor = Fault.find(filter);
    for (const [path, select] of FAULT_POPULATE_FIELDS) cursor = cursor.populate(path, select);
    return cursor.sort({ createdAt: -1 });
}

/**
 * Fetches a single fault within a company.
 *
 * @param {string} companyId - Tenant scope.
 * @param {string} faultId - The fault's ObjectId.
 * @throws {Error & { status: number }} 404 if not found in this company.
 * @returns {Promise<Object>} The fault, populated with tool/operator/resolvedBy.
 */
async function getFaultById(companyId, faultId) {
    const fault = await Fault.findOne({ _id: faultId, companyId })
        .populate('tool')
        .populate('operator', 'name email role')
        .populate('resolvedBy', 'name email role');

    if (!fault) {
        throw httpError(404, 'Fault not found');
    }
    return fault;
}

/**
 * Creates a fault report for a tool within a company. Engine hours reported
 * here are recorded on the fault but never applied to the tool's
 * currentEngineHours immediately -- that only happens when the fault is
 * resolved (see {@link closeFault}), and only if higher than the current
 * reading.
 *
 * @param {string} companyId - Tenant scope for the new fault and for the referenced tool lookup.
 * @param {string} userId - The reporting user (stored as `operator`).
 * @param {{ tool?: string, description?: string, code?: string, photos?: string|string[], engineHours?: string|number }} body - Raw request body.
 * @param {Array<{ buffer: Buffer, mimetype: string, originalname: string }>} [files] - Uploaded photo files (from multer memory storage), if any.
 * @throws {Error & { status: number }} 400 if description/tool are missing or the tool doesn't belong to this company.
 * @returns {Promise<Object>} The created, populated fault.
 */
async function createFault(companyId, userId, body, files = []) {
    if (!body || typeof body !== 'object') {
        throw httpError(400, 'No data provided');
    }

    const { tool: toolId, description, code, photos: bodyPhotos, engineHours } = body;

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
        throw httpError(400, 'Description is required');
    }

    if (!toolId) {
        throw httpError(400, 'Tool reference is required');
    }

    // Validate that the tool belongs to this company
    const tool = await Tool.findOne({ _id: toolId, companyId });
    if (!tool) {
        throw httpError(400, 'Referenced tool does not exist in your organization');
    }

    // Store each uploaded photo in GridFS and collect its `/uploads/<id>` reference.
    const uploadedPhotos = files && files.length
        ? await Promise.all(files.map(async (f) => {
            const id = await mediaStorage.storeFile({
                buffer: f.buffer,
                filename: f.originalname,
                contentType: f.mimetype,
            });
            return `/uploads/${id}`;
        }))
        : [];

    // Parse any photo URLs sent in the body
    let additionalPhotos = [];
    if (bodyPhotos) {
        if (Array.isArray(bodyPhotos)) {
            additionalPhotos = bodyPhotos.filter(p => typeof p === 'string' && p.trim().length > 0);
        } else if (typeof bodyPhotos === 'string') {
            additionalPhotos = bodyPhotos.split(',').map(s => s.trim()).filter(Boolean);
        }
    }

    const allPhotos = [...uploadedPhotos, ...additionalPhotos];

    const parsedHours = engineHours !== undefined && engineHours !== '' ? parseFloat(engineHours) : undefined;
    const validHours = parsedHours !== undefined && !isNaN(parsedHours) && parsedHours >= 0 ? parsedHours : undefined;

    const fault = await Fault.create({
        companyId,
        tool: tool._id,
        operator: userId,
        description: description.trim(),
        code: code && typeof code === 'string' ? code.trim() : undefined,
        engineHours: validHours,
        photos: allPhotos,
        status: FAULT_STATUS.OPEN,
    });

    // Atomically push fault into Tool backref without modifying currentEngineHours.
    // Machine engine hours are only updated when a mechanic/admin resolves the fault and only if higher.
    // This update and the populated re-fetch below are independent (neither
    // reads what the other writes), so run them concurrently.
    const [, populatedFault] = await Promise.all([
        Tool.findOneAndUpdate(
            { _id: tool._id, companyId },
            { $push: { faults: fault._id } }
        ),
        Fault.findById(fault._id)
            .populate('tool', 'name serialNumber model currentEngineHours')
            .populate('operator', 'name email role')
            .populate('resolvedBy', 'name email role'),
    ]);

    return populatedFault;
}

/**
 * Closes (resolves) a fault, recording the resolution and, if a valid
 * closing engine-hours reading is given, syncing it into the tool's
 * currentEngineHours (only ever raising it).
 *
 * @param {string} companyId - Tenant scope.
 * @param {string} userId - The user resolving the fault (stored as `resolvedBy`).
 * @param {string} faultId - The fault's ObjectId.
 * @param {{ engineHours?: string|number, resolutionDescription?: string, notes?: string, description?: string }} body - Raw request body.
 * @throws {Error & { status: number }} 404 if not found in this company.
 * @returns {Promise<Object>} The updated, populated fault.
 */
async function closeFault(companyId, userId, faultId, body = {}) {
    const { engineHours, resolutionDescription, notes, description: closingDesc } = body || {};
    const parsedHours = engineHours !== undefined && engineHours !== '' ? parseFloat(engineHours) : null;
    const validHours = parsedHours !== null && !isNaN(parsedHours) && parsedHours >= 0 ? parsedHours : null;
    const resText = resolutionDescription || notes || closingDesc || '';

    const updateData = {
        status: FAULT_STATUS.CLOSED,
        closedAt: new Date(),
        resolvedBy: userId,
        resolutionDescription: typeof resText === 'string' ? resText.trim() : '',
    };
    if (validHours !== null) {
        updateData.closingEngineHours = validHours;
    }

    const fault = await Fault.findOneAndUpdate(
        { _id: faultId, companyId },
        updateData,
        { new: true, runValidators: true }
    ).populate('tool operator resolvedBy');

    if (!fault) {
        throw httpError(404, 'Fault not found');
    }

    // Update equipment's currentEngineHours to the highest recorded value in resolved faults or services
    // (only updates if validHours is higher than current hours)
    if (fault.tool) {
        const toolId = fault.tool._id || fault.tool;
        await syncEquipmentEngineHours(toolId, companyId, validHours);
    }

    return fault;
}

/**
 * Reopens a previously-closed fault, clearing its resolution fields and
 * re-syncing the tool's currentEngineHours (which may drop if this fault
 * held the highest reading).
 *
 * @param {string} companyId - Tenant scope.
 * @param {string} faultId - The fault's ObjectId.
 * @throws {Error & { status: number }} 404 if not found in this company.
 * @returns {Promise<Object>} The updated, populated fault.
 */
async function reopenFault(companyId, faultId) {
    const fault = await Fault.findOneAndUpdate(
        { _id: faultId, companyId },
        {
            status: FAULT_STATUS.OPEN,
            $unset: { closedAt: 1, closingEngineHours: 1, resolutionDescription: 1, resolvedBy: 1 },
        },
        { new: true, runValidators: true }
    ).populate('tool operator resolvedBy');

    if (!fault) {
        throw httpError(404, 'Fault not found');
    }

    if (fault.tool) {
        const toolId = fault.tool._id || fault.tool;
        await syncEquipmentEngineHours(toolId, companyId);
    }

    return fault;
}

/**
 * Deletes a fault within a company, detaches it from its tool's `faults`
 * backref, and re-syncs the tool's currentEngineHours.
 *
 * @param {string} companyId - Tenant scope.
 * @param {string} faultId - The fault's ObjectId.
 * @throws {Error & { status: number }} 404 if not found in this company.
 * @returns {Promise<void>}
 */
async function deleteFault(companyId, faultId) {
    const fault = await Fault.findOneAndDelete({ _id: faultId, companyId });

    if (!fault) {
        throw httpError(404, 'Fault not found');
    }

    // Best-effort: an externally-hosted photo URL has nothing in GridFS to
    // delete (idFromUrl returns null for those), and a storage hiccup here
    // must never turn an already-completed delete into an error.
    await Promise.all(
        (fault.photos || [])
            .map(mediaStorage.idFromUrl)
            .filter(Boolean)
            .map(id => mediaStorage.deleteFile(id))
    );

    if (fault.tool) {
        const toolId = fault.tool._id || fault.tool;
        await Tool.findOneAndUpdate(
            { _id: toolId, companyId },
            { $pull: { faults: fault._id } }
        );
        await syncEquipmentEngineHours(toolId, companyId);
    }
}

/**
 * Partially updates a fault's editable fields (description, code,
 * engineHours, resolutionDescription, status), re-syncing the tool's
 * currentEngineHours afterward.
 *
 * @param {string} companyId - Tenant scope.
 * @param {string} userId - The user performing the update (stored as `resolvedBy` if the update closes the fault).
 * @param {string} faultId - The fault's ObjectId.
 * @param {Record<string, *>} body - Raw request body; only recognized fields are applied.
 * @throws {Error & { status: number }} 400 if the body is missing, or 404 if not found in this company.
 * @returns {Promise<Object>} The updated, populated fault.
 */
async function updateFault(companyId, userId, faultId, body) {
    if (!body || typeof body !== 'object') {
        throw httpError(400, 'No data provided');
    }

    const updates = {};
    if (body.description && typeof body.description === 'string' && body.description.trim()) {
        updates.description = body.description.trim();
    }
    if (body.code !== undefined) {
        updates.code = typeof body.code === 'string' ? body.code.trim() : body.code;
    }
    if (body.engineHours !== undefined && body.engineHours !== '') {
        const parsed = parseFloat(body.engineHours);
        if (!isNaN(parsed) && parsed >= 0) {
            updates.engineHours = parsed;
        }
    }
    if (body.resolutionDescription !== undefined) {
        updates.resolutionDescription = typeof body.resolutionDescription === 'string' ? body.resolutionDescription.trim() : '';
    }
    if (body.status && ALL_FAULT_STATUSES.includes(body.status)) {
        updates.status = body.status;
        if (updates.status === FAULT_STATUS.CLOSED) {
            updates.closedAt = new Date();
            updates.resolvedBy = userId;
        } else {
            updates.$unset = { closedAt: 1, closingEngineHours: 1, resolutionDescription: 1, resolvedBy: 1 };
        }
    }

    const fault = await Fault.findOneAndUpdate(
        { _id: faultId, companyId },
        updates,
        { new: true, runValidators: true }
    ).populate('tool', 'name serialNumber model currentEngineHours')
     .populate('operator', 'name email role')
     .populate('resolvedBy', 'name email role');

    if (!fault) {
        throw httpError(404, 'Fault not found');
    }

    if (fault.tool) {
        const toolId = fault.tool._id || fault.tool;
        await syncEquipmentEngineHours(toolId, companyId);
    }

    return fault;
}

module.exports = {
    getAllFaults,
    getFaultById,
    createFault,
    closeFault,
    reopenFault,
    deleteFault,
    updateFault,
};
