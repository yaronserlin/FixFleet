// services/equipmentService.js
const Equipment = require('../models/Equipment');
const Fault = require('../models/Fault');
const Part = require('../models/Part');
const Maintenance = require('../models/Maintenance');
const { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } = require('../constants/pagination');
const { SCHEDULE_STATUS } = require('../constants/scheduleStatus');
const { syncEquipmentEngineHours } = require('../utils/equipmentEngineHours');
const { httpError } = require('../utils/httpError');
const mediaStorage = require('../utils/mediaStorage');

const Tool = Equipment;

const ALLOWED_EQUIPMENT_FIELDS = ['name', 'serialNumber', 'description', 'model', 'localSerialNumber', 'currentEngineHours'];

/**
 * Picks only the whitelisted, client-settable equipment fields out of an
 * arbitrary request body, coercing `currentEngineHours` to a valid
 * non-negative number when present.
 *
 * @param {Record<string, *>} body - Raw request body.
 * @returns {Record<string, *>} Filtered field set.
 */
function filterEquipmentFields(body) {
    const data = {};
    for (const field of ALLOWED_EQUIPMENT_FIELDS) {
        if (body[field] !== undefined) {
            if (field === 'currentEngineHours') {
                const parsed = parseFloat(body[field]);
                if (!isNaN(parsed) && parsed >= 0) {
                    data[field] = parsed;
                }
            } else {
                data[field] = typeof body[field] === 'string' ? body[field].trim() : body[field];
            }
        }
    }
    return data;
}

/**
 * Lists equipment/tools for a company, optionally paginated.
 *
 * @param {string} companyId - Tenant scope; only equipment for this company is returned.
 * @param {{ page?: string|number, limit?: string|number }} [query] - Raw pagination query params.
 * @returns {Promise<Array<Object>|{ tools: Array<Object>, page: number, limit: number, total: number, pages: number }>}
 *   A plain array when no pagination params are given, otherwise a paginated envelope.
 */
async function getAllTools(companyId, query = {}) {
    const { page, limit } = query;
    const filter = { companyId };

    if (page || limit) {
        const pageNum = Math.max(1, parseInt(page, 10) || DEFAULT_PAGE);
        const limitNum = Math.max(1, Math.min(MAX_LIMIT, parseInt(limit, 10) || DEFAULT_LIMIT));
        const skip = (pageNum - 1) * limitNum;

        const [tools, total] = await Promise.all([
            Equipment.find(filter)
                .populate('faults')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            Equipment.countDocuments(filter),
        ]);

        return {
            tools,
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
        };
    }

    return Equipment.find(filter)
        .populate('faults')
        .sort({ createdAt: -1 });
}

/**
 * Fetches a single tool within a company, first re-syncing its
 * currentEngineHours (and derived schedule statuses) to the latest known
 * readings.
 *
 * @param {string} companyId - Tenant scope.
 * @param {string} toolId - The equipment's ObjectId.
 * @throws {Error & { status: number }} 404 if not found in this company.
 * @returns {Promise<Object>} The tool, populated with faults and each fault's operator.
 */
async function getToolById(companyId, toolId) {
    await syncEquipmentEngineHours(toolId, companyId);
    const tool = await Equipment.findOne({ _id: toolId, companyId })
        .populate({
            path: 'faults',
            populate: {
                path: 'operator',
                select: 'name email',
            },
        });

    if (!tool) {
        throw httpError(404, 'Equipment not found');
    }
    return tool;
}

/**
 * Creates a piece of equipment/tool for a company.
 *
 * @param {string} companyId - Tenant scope for the new record.
 * @param {Record<string, *>} body - Raw request body.
 * @throws {Error & { status: number }} 400 if the body is missing or `name` is blank.
 * @returns {Promise<Object>} The created equipment document.
 */
async function createTool(companyId, body) {
    if (!body || typeof body !== 'object') {
        throw httpError(400, 'No data provided');
    }

    const data = filterEquipmentFields(body);
    if (!data.name || data.name.trim().length === 0) {
        throw httpError(400, 'Equipment name is required');
    }

    return Equipment.create({
        ...data,
        companyId,
    });
}

/**
 * Updates a tool's editable fields within a company.
 *
 * @param {string} companyId - Tenant scope.
 * @param {string} toolId - The equipment's ObjectId.
 * @param {Record<string, *>} body - Raw request body.
 * @throws {Error & { status: number }} 400 if the body/updates are empty, or 404 if not found in this company.
 * @returns {Promise<Object>} The updated equipment document.
 */
async function updateTool(companyId, toolId, body) {
    if (!body || typeof body !== 'object') {
        throw httpError(400, 'No data provided');
    }

    const updates = filterEquipmentFields(body);
    if (Object.keys(updates).length === 0) {
        throw httpError(400, 'No valid fields provided for update');
    }

    const tool = await Equipment.findOneAndUpdate(
        { _id: toolId, companyId },
        updates,
        { new: true, runValidators: true }
    );

    if (!tool) {
        throw httpError(404, 'Equipment not found');
    }

    return tool;
}

/**
 * Deletes a tool within a company and cascades deletion of its dependent
 * faults, parts, and maintenance records.
 *
 * @param {string} companyId - Tenant scope.
 * @param {string} toolId - The equipment's ObjectId.
 * @throws {Error & { status: number }} 404 if not found in this company.
 * @returns {Promise<void>}
 */
async function deleteTool(companyId, toolId) {
    const tool = await Equipment.findOneAndDelete({ _id: toolId, companyId });

    if (!tool) {
        throw httpError(404, 'Equipment not found');
    }

    // Best-effort cleanup of this tool's own book PDFs in GridFS -- see the
    // matching comment in faultService.js's deleteFault.
    await Promise.all(
        (tool.books || [])
            .map(book => mediaStorage.idFromUrl(book.fileUrl))
            .filter(Boolean)
            .map(id => mediaStorage.deleteFile(id))
    );

    // Cascade cleanup of dependent records within this company
    await Promise.all([
        Fault.deleteMany({ tool: tool._id, companyId }),
        Part.deleteMany({ tool: tool._id, companyId }),
        Maintenance.deleteMany({ tool: tool._id, companyId }),
    ]);
}

/**
 * Attaches an uploaded PDF book/manual to a tool.
 *
 * @param {string} companyId - Tenant scope.
 * @param {string} toolId - The equipment's ObjectId.
 * @param {{ buffer: Buffer, mimetype: string, originalname: string, size: number }} file - The uploaded file (from multer memory storage).
 * @param {{ title?: string }} body - Raw request body.
 * @throws {Error & { status: number }} 400 if the file/title are missing, or 404 if the tool isn't found in this company.
 * @returns {Promise<Object>} The updated equipment document, including the new book.
 */
async function addBook(companyId, toolId, file, body) {
    if (!file) {
        throw httpError(400, 'PDF document is required');
    }
    const { title } = body || {};
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
        throw httpError(400, 'Book title is required');
    }

    // Confirmed before storing the file so a bad toolId doesn't orphan it in GridFS.
    const exists = await Equipment.exists({ _id: toolId, companyId });
    if (!exists) {
        throw httpError(404, 'Equipment not found');
    }

    const fileId = await mediaStorage.storeFile({
        buffer: file.buffer,
        filename: file.originalname,
        contentType: file.mimetype,
    });

    const book = {
        title: title.trim(),
        fileUrl: `/uploads/${fileId}`,
        fileName: file.originalname,
        fileSize: file.size,
        uploadedAt: new Date(),
    };

    const tool = await Equipment.findOneAndUpdate(
        { _id: toolId, companyId },
        { $push: { books: book } },
        { new: true }
    );

    if (!tool) {
        throw httpError(404, 'Equipment not found');
    }

    return tool;
}

/**
 * Removes a book from a tool, along with its PDF in GridFS.
 *
 * @param {string} companyId - Tenant scope.
 * @param {string} toolId - The equipment's ObjectId.
 * @param {string} bookId - The book subdocument's ObjectId.
 * @throws {Error & { status: number }} 404 if the tool isn't found in this company.
 * @returns {Promise<Object>} The updated equipment document.
 */
async function deleteBook(companyId, toolId, bookId) {
    const before = await Equipment.findOne(
        { _id: toolId, companyId, 'books._id': bookId },
        { 'books.$': 1 }
    );
    const fileId = before?.books?.[0] ? mediaStorage.idFromUrl(before.books[0].fileUrl) : null;

    const tool = await Equipment.findOneAndUpdate(
        { _id: toolId, companyId },
        { $pull: { books: { _id: bookId } } },
        { new: true }
    );

    if (!tool) {
        throw httpError(404, 'Equipment not found');
    }

    if (fileId) {
        await mediaStorage.deleteFile(fileId);
    }

    return tool;
}

/**
 * Adds a recurring maintenance schedule task to a tool.
 *
 * @param {string} companyId - Tenant scope.
 * @param {string} toolId - The equipment's ObjectId.
 * @param {{ title?: string, description?: string, intervalHours?: string|number, intervalDays?: string|number, checklist?: Array<string|{text:string}> }} body - Raw request body.
 * @throws {Error & { status: number }} 400 if `title` is missing, or 404 if the tool isn't found in this company.
 * @returns {Promise<Object>} The updated equipment document, including the new schedule task.
 */
async function addSchedule(companyId, toolId, body) {
    const { title, description, intervalHours, intervalDays, checklist } = body || {};
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
        throw httpError(400, 'Schedule title is required');
    }

    const tool = await Equipment.findOne({ _id: toolId, companyId });
    if (!tool) {
        throw httpError(404, 'Equipment not found');
    }

    const intHours = parseInt(intervalHours, 10) || 0;
    const intDays = parseInt(intervalDays, 10) || 0;
    const nextDueHours = intHours > 0 ? (tool.currentEngineHours || 0) + intHours : 0;
    let nextDueDate;
    if (intDays > 0) {
        nextDueDate = new Date();
        nextDueDate.setDate(nextDueDate.getDate() + intDays);
    }

    let formattedChecklist = [];
    if (Array.isArray(checklist)) {
        formattedChecklist = checklist
            .map(item => {
                if (typeof item === 'string') return item.trim();
                if (item && typeof item.text === 'string') return item.text.trim();
                return '';
            })
            .filter(text => text.length > 0)
            .map(text => ({ text, done: false }));
    }

    const scheduleItem = {
        title: title.trim(),
        description: description ? description.trim() : '',
        intervalHours: intHours,
        intervalDays: intDays,
        lastPerformedHours: tool.currentEngineHours || 0,
        lastPerformedDate: new Date(),
        nextDueHours,
        nextDueDate,
        status: SCHEDULE_STATUS.NORMAL,
        checklist: formattedChecklist,
    };

    tool.maintenanceSchedule.push(scheduleItem);
    await tool.save();

    return tool;
}

/**
 * Removes a maintenance schedule task from a tool.
 *
 * @param {string} companyId - Tenant scope.
 * @param {string} toolId - The equipment's ObjectId.
 * @param {string} scheduleId - The schedule subdocument's ObjectId.
 * @throws {Error & { status: number }} 404 if the tool isn't found in this company.
 * @returns {Promise<Object>} The updated equipment document.
 */
async function deleteSchedule(companyId, toolId, scheduleId) {
    const tool = await Equipment.findOneAndUpdate(
        { _id: toolId, companyId },
        { $pull: { maintenanceSchedule: { _id: scheduleId } } },
        { new: true }
    );

    if (!tool) {
        throw httpError(404, 'Equipment not found');
    }

    return tool;
}

/**
 * Marks a maintenance schedule task complete: records a Maintenance log
 * entry, resets the task's checklist for the next cycle, advances its
 * next-due hours/date, and re-syncs the tool's currentEngineHours.
 *
 * @param {string} companyId - Tenant scope.
 * @param {string} userId - The mechanic/admin completing the task (stored as `mechanic` on the Maintenance record).
 * @param {string} toolId - The equipment's ObjectId.
 * @param {string} scheduleId - The schedule subdocument's ObjectId.
 * @param {{ currentEngineHours?: string|number, notes?: string }} body - Raw request body.
 * @throws {Error & { status: number }} 404 if the tool or the task isn't found in this company.
 * @returns {Promise<Object>} The updated equipment document (post engine-hours sync).
 */
async function completeSchedule(companyId, userId, toolId, scheduleId, body) {
    const { currentEngineHours, notes } = body || {};
    const tool = await Equipment.findOne({ _id: toolId, companyId });
    if (!tool) {
        throw httpError(404, 'Equipment not found');
    }

    const task = tool.maintenanceSchedule.id(scheduleId);
    if (!task) {
        throw httpError(404, 'Maintenance task not found');
    }

    const parsedHours = currentEngineHours !== undefined && currentEngineHours !== '' && !isNaN(parseFloat(currentEngineHours))
        ? parseFloat(currentEngineHours)
        : null;
    const validHours = (parsedHours !== null && parsedHours >= 0) ? parsedHours : (tool.currentEngineHours || 0);

    // Update equipment's currentEngineHours to the highest recorded reading
    if (validHours > (tool.currentEngineHours || 0)) {
        tool.currentEngineHours = validHours;
    }

    task.lastPerformedHours = validHours;
    task.lastPerformedDate = new Date();
    if (task.intervalHours > 0) {
        task.nextDueHours = tool.currentEngineHours + task.intervalHours;
    }
    if (task.intervalDays > 0) {
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + task.intervalDays);
        task.nextDueDate = nextDate;
    }
    task.status = SCHEDULE_STATUS.NORMAL;

    // Capture snapshot of checklist items before resetting
    const checklistSnapshot = (task.checklist || []).map(item => ({
        text: item.text,
        done: Boolean(item.done),
    }));

    // Reset checklist items and inProgressNotes for the next service cycle (clean checklist)
    if (task.checklist?.length > 0) {
        task.checklist.forEach(item => { item.done = false; });
    }
    task.inProgressNotes = '';
    tool.markModified('maintenanceSchedule');

    let detailsText = `Routine: ${task.title}`;
    if (task.description && typeof task.description === 'string' && task.description.trim()) {
        detailsText += ` - ${task.description.trim()}`;
    }
    if (notes && typeof notes === 'string' && notes.trim()) {
        detailsText += `\nNotes: ${notes.trim()}`;
    }

    // Record entry in Maintenance collection with checklist and service engine hours.
    // This write and saving the mutated `tool` document are independent
    // (different collections, neither reads what the other writes), so run
    // them concurrently.
    await Promise.all([
        Maintenance.create({
            companyId,
            tool: tool._id,
            mechanic: userId,
            details: detailsText,
            engineHours: validHours,
            checklist: checklistSnapshot,
            date: new Date(),
        }),
        tool.save(),
    ]);

    // Update equipment's currentEngineHours to highest value recorded in resolved faults or services
    const updatedTool = await syncEquipmentEngineHours(tool._id, companyId, validHours);
    return updatedTool || tool;
}

/**
 * Fetches a single maintenance schedule task alongside its parent equipment.
 *
 * @param {string} companyId - Tenant scope.
 * @param {string} toolId - The equipment's ObjectId.
 * @param {string} scheduleId - The schedule subdocument's ObjectId.
 * @throws {Error & { status: number }} 404 if the tool or the task isn't found in this company.
 * @returns {Promise<{ equipment: Object, schedule: Object }>}
 */
async function getSchedule(companyId, toolId, scheduleId) {
    const equipment = await Equipment.findOne({ _id: toolId, companyId });
    if (!equipment) {
        throw httpError(404, 'Equipment not found');
    }
    const schedule = equipment.maintenanceSchedule.id(scheduleId);
    if (!schedule) {
        throw httpError(404, 'Maintenance schedule not found');
    }
    return { equipment, schedule };
}

/**
 * Adds a checklist item to a maintenance schedule task.
 *
 * @param {string} companyId - Tenant scope.
 * @param {string} toolId - The equipment's ObjectId.
 * @param {string} scheduleId - The schedule subdocument's ObjectId.
 * @param {{ text?: string }} body - Raw request body.
 * @throws {Error & { status: number }} 400 if `text` is missing, or 404 if the tool/task isn't found in this company.
 * @returns {Promise<{ equipment: Object, schedule: Object }>}
 */
async function addChecklistItem(companyId, toolId, scheduleId, body) {
    const { text } = body || {};
    if (!text || typeof text !== 'string' || !text.trim()) {
        throw httpError(400, 'Task text is required');
    }
    const equipment = await Equipment.findOne({ _id: toolId, companyId });
    if (!equipment) {
        throw httpError(404, 'Equipment not found');
    }
    const schedule = equipment.maintenanceSchedule.id(scheduleId);
    if (!schedule) {
        throw httpError(404, 'Maintenance schedule not found');
    }
    schedule.checklist.push({ text: text.trim(), done: false });
    equipment.markModified('maintenanceSchedule');
    await equipment.save();
    return { equipment, schedule };
}

/**
 * Toggles a checklist item's done state on a maintenance schedule task.
 *
 * @param {string} companyId - Tenant scope.
 * @param {string} toolId - The equipment's ObjectId.
 * @param {string} scheduleId - The schedule subdocument's ObjectId.
 * @param {string} itemId - The checklist item's ObjectId.
 * @throws {Error & { status: number }} 404 if the tool/task/item isn't found in this company.
 * @returns {Promise<{ equipment: Object, schedule: Object }>}
 */
async function toggleChecklistItem(companyId, toolId, scheduleId, itemId) {
    const equipment = await Equipment.findOne({ _id: toolId, companyId });
    if (!equipment) {
        throw httpError(404, 'Equipment not found');
    }
    const schedule = equipment.maintenanceSchedule.id(scheduleId);
    if (!schedule) {
        throw httpError(404, 'Maintenance schedule not found');
    }
    const item = schedule.checklist.id(itemId);
    if (!item) {
        throw httpError(404, 'Checklist item not found');
    }
    item.done = !item.done;
    equipment.markModified('maintenanceSchedule');
    await equipment.save();
    return { equipment, schedule };
}

/**
 * Removes a checklist item from a maintenance schedule task.
 *
 * @param {string} companyId - Tenant scope.
 * @param {string} toolId - The equipment's ObjectId.
 * @param {string} scheduleId - The schedule subdocument's ObjectId.
 * @param {string} itemId - The checklist item's ObjectId.
 * @throws {Error & { status: number }} 404 if the tool/task isn't found in this company.
 * @returns {Promise<{ equipment: Object, schedule: Object }>}
 */
async function deleteChecklistItem(companyId, toolId, scheduleId, itemId) {
    const equipment = await Equipment.findOne({ _id: toolId, companyId });
    if (!equipment) {
        throw httpError(404, 'Equipment not found');
    }
    const schedule = equipment.maintenanceSchedule.id(scheduleId);
    if (!schedule) {
        throw httpError(404, 'Maintenance schedule not found');
    }
    schedule.checklist.pull({ _id: itemId });
    equipment.markModified('maintenanceSchedule');
    await equipment.save();
    return { equipment, schedule };
}

/**
 * Updates the free-text in-progress notes on a maintenance schedule task.
 *
 * @param {string} companyId - Tenant scope.
 * @param {string} toolId - The equipment's ObjectId.
 * @param {string} scheduleId - The schedule subdocument's ObjectId.
 * @param {{ inProgressNotes?: string }} body - Raw request body.
 * @throws {Error & { status: number }} 404 if the tool/task isn't found in this company.
 * @returns {Promise<{ equipment: Object, schedule: Object }>}
 */
async function updateScheduleProgress(companyId, toolId, scheduleId, body) {
    const { inProgressNotes } = body || {};
    const equipment = await Equipment.findOne({ _id: toolId, companyId });
    if (!equipment) {
        throw httpError(404, 'Equipment not found');
    }
    const schedule = equipment.maintenanceSchedule.id(scheduleId);
    if (!schedule) {
        throw httpError(404, 'Maintenance schedule not found');
    }
    if (inProgressNotes !== undefined) {
        schedule.inProgressNotes = typeof inProgressNotes === 'string' ? inProgressNotes.trim() : '';
    }
    equipment.markModified('maintenanceSchedule');
    await equipment.save();
    return { equipment, schedule };
}

module.exports = {
    filterEquipmentFields,
    getAllTools,
    getToolById,
    createTool,
    updateTool,
    deleteTool,
    addBook,
    deleteBook,
    addSchedule,
    deleteSchedule,
    completeSchedule,
    getSchedule,
    addChecklistItem,
    toggleChecklistItem,
    deleteChecklistItem,
    updateScheduleProgress,
};
