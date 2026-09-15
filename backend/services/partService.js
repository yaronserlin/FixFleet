// services/partService.js
const Part = require('../models/Part');
const Tool = require('../models/Tool');
const { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } = require('../constants/pagination');
const { httpError } = require('../utils/httpError');

const ALLOWED_PART_FIELDS = ['name', 'partNumber', 'tool', 'inStock'];

/**
 * Picks only the whitelisted, client-settable part fields out of an
 * arbitrary request body, ignoring anything else the caller might send.
 *
 * @param {Record<string, *>} body - Raw request body.
 * @returns {{ name?: string, partNumber?: string, tool?: string, inStock?: number }} Filtered field set.
 */
function filterPartFields(body) {
    const data = {};
    for (const field of ALLOWED_PART_FIELDS) {
        if (body[field] !== undefined) {
            data[field] = body[field];
        }
    }
    return data;
}

/**
 * Lists parts belonging to a company, optionally paginated.
 *
 * @param {string} companyId - Tenant scope; only parts for this company are returned.
 * @param {{ page?: string|number, limit?: string|number }} [query] - Raw pagination query params.
 * @returns {Promise<Array<Object>|{ parts: Array<Object>, page: number, limit: number, total: number, pages: number }>}
 *   A plain array when no pagination params are given, otherwise a paginated envelope.
 */
async function getAllParts(companyId, query = {}) {
    const { page, limit } = query;
    const filter = { companyId };

    if (page || limit) {
        const pageNum = Math.max(1, parseInt(page, 10) || DEFAULT_PAGE);
        const limitNum = Math.max(1, Math.min(MAX_LIMIT, parseInt(limit, 10) || DEFAULT_LIMIT));
        const skip = (pageNum - 1) * limitNum;

        const [parts, total] = await Promise.all([
            Part.find(filter)
                .populate('tool', 'name serialNumber model')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            Part.countDocuments(filter),
        ]);

        return {
            parts,
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
        };
    }

    return Part.find(filter)
        .populate('tool', 'name serialNumber model')
        .sort({ createdAt: -1 });
}

/**
 * Creates a part for a company, validating the request body and (if a
 * `tool` reference is given) that it belongs to the same company.
 *
 * @param {string} companyId - Tenant scope for the new part and for the referenced tool lookup.
 * @param {Record<string, *>} body - Raw request body.
 * @throws {Error & { status: number }} 400 if the body is missing/invalid, or the referenced tool doesn't belong to the company.
 * @returns {Promise<Object>} The created part document.
 */
async function createPart(companyId, body) {
    if (!body || typeof body !== 'object') {
        throw httpError(400, 'No data provided');
    }

    const data = filterPartFields(body);
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
        throw httpError(400, 'Part name is required');
    }

    if (data.tool) {
        const toolExists = await Tool.findOne({ _id: data.tool, companyId });
        if (!toolExists) {
            throw httpError(400, 'Referenced tool does not exist in your organization');
        }
    }

    return Part.create({
        ...data,
        name: data.name.trim(),
        companyId,
    });
}

/**
 * Updates a part within a company, validating the body and (if a `tool`
 * reference is given) that it belongs to the same company.
 *
 * @param {string} companyId - Tenant scope for the update and for the referenced tool lookup.
 * @param {string} partId - The part's ObjectId.
 * @param {Record<string, *>} body - Raw request body.
 * @throws {Error & { status: number }} 400 for an invalid body, or 404 if the part isn't found in this company.
 * @returns {Promise<Object>} The updated part document.
 */
async function updatePart(companyId, partId, body) {
    if (!body || typeof body !== 'object') {
        throw httpError(400, 'No data provided');
    }

    const updates = filterPartFields(body);
    if (updates.name !== undefined && (typeof updates.name !== 'string' || updates.name.trim().length === 0)) {
        throw httpError(400, 'Part name cannot be empty');
    }
    if (updates.name) {
        updates.name = updates.name.trim();
    }

    if (updates.tool) {
        const toolExists = await Tool.findOne({ _id: updates.tool, companyId });
        if (!toolExists) {
            throw httpError(400, 'Referenced tool does not exist in your organization');
        }
    }

    const part = await Part.findOneAndUpdate(
        { _id: partId, companyId },
        updates,
        { new: true, runValidators: true }
    ).populate('tool', 'name serialNumber model');

    if (!part) {
        throw httpError(404, 'Part not found');
    }

    return part;
}

/**
 * Deletes a part within a company.
 *
 * @param {string} companyId - Tenant scope for the deletion.
 * @param {string} partId - The part's ObjectId.
 * @throws {Error & { status: number }} 404 if the part isn't found in this company.
 * @returns {Promise<void>}
 */
async function deletePart(companyId, partId) {
    const part = await Part.findOneAndDelete({ _id: partId, companyId });
    if (!part) {
        throw httpError(404, 'Part not found');
    }
}

module.exports = {
    filterPartFields,
    getAllParts,
    createPart,
    updatePart,
    deletePart,
};
