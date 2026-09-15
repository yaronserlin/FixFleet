// controllers/equipmentController.js
const Equipment = require('../models/Equipment');
const { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } = require('../constants/pagination');
const Tool = Equipment;
const Fault = require('../models/Fault');
const Part = require('../models/Part');
const Maintenance = require('../models/Maintenance');
const { syncEquipmentEngineHours } = require('../utils/equipmentEngineHours');

const ALLOWED_EQUIPMENT_FIELDS = ['name', 'serialNumber', 'description', 'model', 'localSerialNumber', 'currentEngineHours'];

const filterEquipmentFields = (body) => {
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
};

exports.getAllTools = async (req, res, next) => {
    try {
        const { page, limit } = req.query;
        const query = { companyId: req.user.companyId };

        if (page || limit) {
            const pageNum = Math.max(1, parseInt(page, 10) || DEFAULT_PAGE);
            const limitNum = Math.max(1, Math.min(MAX_LIMIT, parseInt(limit, 10) || DEFAULT_LIMIT));
            const skip = (pageNum - 1) * limitNum;

            const [tools, total] = await Promise.all([
                Equipment.find(query)
                    .populate('faults')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limitNum),
                Equipment.countDocuments(query),
            ]);

            return res.json({
                tools,
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum),
            });
        }

        const tools = await Equipment.find(query)
            .populate('faults')
            .sort({ createdAt: -1 });

        res.json(tools);
    } catch (err) {
        next(err);
    }
};

exports.getToolById = async (req, res, next) => {
    try {
        await syncEquipmentEngineHours(req.params.id, req.user.companyId);
        const tool = await Equipment.findOne({ _id: req.params.id, companyId: req.user.companyId })
            .populate({
                path: 'faults',
                populate: {
                    path: 'operator',
                    select: 'name email',
                },
            });

        if (!tool) {
            return res.status(404).json({ message: 'Equipment not found' });
        }
        res.json(tool);
    } catch (err) {
        next(err);
    }
};

exports.createTool = async (req, res, next) => {
    try {
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({ message: 'No data provided' });
        }

        const data = filterEquipmentFields(req.body);
        if (!data.name || data.name.trim().length === 0) {
            return res.status(400).json({ message: 'Equipment name is required' });
        }

        const tool = await Equipment.create({
            ...data,
            companyId: req.user.companyId,
        });

        res.status(201).json(tool);
    } catch (err) {
        next(err);
    }
};

exports.updateTool = async (req, res, next) => {
    try {
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({ message: 'No data provided' });
        }

        const updates = filterEquipmentFields(req.body);
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: 'No valid fields provided for update' });
        }

        const tool = await Equipment.findOneAndUpdate(
            { _id: req.params.id, companyId: req.user.companyId },
            updates,
            { new: true, runValidators: true }
        );

        if (!tool) {
            return res.status(404).json({ message: 'Equipment not found' });
        }

        res.json(tool);
    } catch (err) {
        next(err);
    }
};

exports.deleteTool = async (req, res, next) => {
    try {
        const tool = await Equipment.findOneAndDelete({
            _id: req.params.id,
            companyId: req.user.companyId,
        });

        if (!tool) {
            return res.status(404).json({ message: 'Equipment not found' });
        }

        // Cascade cleanup of dependent records within this company
        await Promise.all([
            Fault.deleteMany({ tool: tool._id, companyId: req.user.companyId }),
            Part.deleteMany({ tool: tool._id, companyId: req.user.companyId }),
            Maintenance.deleteMany({ tool: tool._id, companyId: req.user.companyId }),
        ]);

        res.status(204).end();
    } catch (err) {
        next(err);
    }
};

// Books (PDFs) Management
exports.addBook = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'PDF document is required' });
        }
        const { title } = req.body;
        if (!title || typeof title !== 'string' || title.trim().length === 0) {
            return res.status(400).json({ message: 'Book title is required' });
        }

        const book = {
            title: title.trim(),
            fileUrl: `/uploads/${req.file.filename}`,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            uploadedAt: new Date(),
        };

        const tool = await Equipment.findOneAndUpdate(
            { _id: req.params.id, companyId: req.user.companyId },
            { $push: { books: book } },
            { new: true }
        );

        if (!tool) {
            return res.status(404).json({ message: 'Equipment not found' });
        }

        res.status(201).json(tool);
    } catch (err) {
        next(err);
    }
};

exports.deleteBook = async (req, res, next) => {
    try {
        const tool = await Equipment.findOneAndUpdate(
            { _id: req.params.id, companyId: req.user.companyId },
            { $pull: { books: { _id: req.params.bookId } } },
            { new: true }
        );

        if (!tool) {
            return res.status(404).json({ message: 'Equipment not found' });
        }

        res.json(tool);
    } catch (err) {
        next(err);
    }
};

// Maintenance Schedule Management
exports.addSchedule = async (req, res, next) => {
    try {
        const { title, description, intervalHours, intervalDays, checklist } = req.body || {};
        if (!title || typeof title !== 'string' || title.trim().length === 0) {
            return res.status(400).json({ message: 'Schedule title is required' });
        }

        const tool = await Equipment.findOne({ _id: req.params.id, companyId: req.user.companyId });
        if (!tool) {
            return res.status(404).json({ message: 'Equipment not found' });
        }

        const intHours = parseInt(intervalHours, 10) || 0;
        const intDays = parseInt(intervalDays, 10) || 0;
        const nextDueHours = intHours > 0 ? (tool.currentEngineHours || 0) + intHours : 0;
        let nextDueDate = undefined;
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
            status: 'normal',
            checklist: formattedChecklist,
        };

        tool.maintenanceSchedule.push(scheduleItem);
        await tool.save();

        res.status(201).json(tool);
    } catch (err) {
        next(err);
    }
};

exports.deleteSchedule = async (req, res, next) => {
    try {
        const tool = await Equipment.findOneAndUpdate(
            { _id: req.params.id, companyId: req.user.companyId },
            { $pull: { maintenanceSchedule: { _id: req.params.scheduleId } } },
            { new: true }
        );

        if (!tool) {
            return res.status(404).json({ message: 'Equipment not found' });
        }

        res.json(tool);
    } catch (err) {
        next(err);
    }
};

exports.completeSchedule = async (req, res, next) => {
    try {
        const { currentEngineHours, notes } = req.body || {};
        const tool = await Equipment.findOne({ _id: req.params.id, companyId: req.user.companyId });
        if (!tool) {
            return res.status(404).json({ message: 'Equipment not found' });
        }

        const task = tool.maintenanceSchedule.id(req.params.scheduleId);
        if (!task) {
            return res.status(404).json({ message: 'Maintenance task not found' });
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
        task.status = 'normal';

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

        // Record entry in Maintenance collection with checklist and service engine hours
        await Maintenance.create({
            companyId: req.user.companyId,
            tool: tool._id,
            mechanic: req.user.userId,
            details: detailsText,
            engineHours: validHours,
            checklist: checklistSnapshot,
            date: new Date(),
        });

        await tool.save();

        // Update equipment's currentEngineHours to highest value recorded in resolved faults or services
        const updatedTool = await syncEquipmentEngineHours(tool._id, req.user.companyId, validHours);
        res.json(updatedTool || tool);
    } catch (err) {
        next(err);
    }
};

// Schedule Details & Checklist (Todo List) Management
exports.getSchedule = async (req, res, next) => {
    try {
        const equipment = await Equipment.findOne({ _id: req.params.id, companyId: req.user.companyId });
        if (!equipment) {
            return res.status(404).json({ message: 'Equipment not found' });
        }
        const schedule = equipment.maintenanceSchedule.id(req.params.scheduleId);
        if (!schedule) {
            return res.status(404).json({ message: 'Maintenance schedule not found' });
        }
        res.json({ equipment, schedule });
    } catch (err) {
        next(err);
    }
};

exports.addChecklistItem = async (req, res, next) => {
    try {
        const { text } = req.body || {};
        if (!text || typeof text !== 'string' || !text.trim()) {
            return res.status(400).json({ message: 'Task text is required' });
        }
        const equipment = await Equipment.findOne({ _id: req.params.id, companyId: req.user.companyId });
        if (!equipment) {
            return res.status(404).json({ message: 'Equipment not found' });
        }
        const schedule = equipment.maintenanceSchedule.id(req.params.scheduleId);
        if (!schedule) {
            return res.status(404).json({ message: 'Maintenance schedule not found' });
        }
        schedule.checklist.push({ text: text.trim(), done: false });
        equipment.markModified('maintenanceSchedule');
        await equipment.save();
        res.status(201).json({ equipment, schedule });
    } catch (err) {
        next(err);
    }
};

exports.toggleChecklistItem = async (req, res, next) => {
    try {
        const { itemId } = req.params;
        const equipment = await Equipment.findOne({ _id: req.params.id, companyId: req.user.companyId });
        if (!equipment) {
            return res.status(404).json({ message: 'Equipment not found' });
        }
        const schedule = equipment.maintenanceSchedule.id(req.params.scheduleId);
        if (!schedule) {
            return res.status(404).json({ message: 'Maintenance schedule not found' });
        }
        const item = schedule.checklist.id(itemId);
        if (!item) {
            return res.status(404).json({ message: 'Checklist item not found' });
        }
        item.done = !item.done;
        equipment.markModified('maintenanceSchedule');
        await equipment.save();
        res.json({ equipment, schedule });
    } catch (err) {
        next(err);
    }
};

exports.deleteChecklistItem = async (req, res, next) => {
    try {
        const { itemId } = req.params;
        const equipment = await Equipment.findOne({ _id: req.params.id, companyId: req.user.companyId });
        if (!equipment) {
            return res.status(404).json({ message: 'Equipment not found' });
        }
        const schedule = equipment.maintenanceSchedule.id(req.params.scheduleId);
        if (!schedule) {
            return res.status(404).json({ message: 'Maintenance schedule not found' });
        }
        schedule.checklist.pull({ _id: itemId });
        equipment.markModified('maintenanceSchedule');
        await equipment.save();
        res.json({ equipment, schedule });
    } catch (err) {
        next(err);
    }
};

exports.updateScheduleProgress = async (req, res, next) => {
    try {
        const { inProgressNotes } = req.body || {};
        const equipment = await Equipment.findOne({ _id: req.params.id, companyId: req.user.companyId });
        if (!equipment) {
            return res.status(404).json({ message: 'Equipment not found' });
        }
        const schedule = equipment.maintenanceSchedule.id(req.params.scheduleId);
        if (!schedule) {
            return res.status(404).json({ message: 'Maintenance schedule not found' });
        }
        if (inProgressNotes !== undefined) {
            schedule.inProgressNotes = typeof inProgressNotes === 'string' ? inProgressNotes.trim() : '';
        }
        equipment.markModified('maintenanceSchedule');
        await equipment.save();
        res.json({ equipment, schedule });
    } catch (err) {
        next(err);
    }
};

// Aliases for equipment-based naming
exports.getAllEquipment = exports.getAllTools;
exports.getEquipmentById = exports.getToolById;
exports.createEquipment = exports.createTool;
exports.updateEquipment = exports.updateTool;
exports.deleteEquipment = exports.deleteTool;
