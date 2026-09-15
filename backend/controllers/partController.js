// controllers/partController.js
const Part = require('../models/Part');
const { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } = require('../constants/pagination');
const Tool = require('../models/Tool');

const ALLOWED_PART_FIELDS = ['name', 'partNumber', 'tool', 'inStock'];

const filterPartFields = (body) => {
    const data = {};
    for (const field of ALLOWED_PART_FIELDS) {
        if (body[field] !== undefined) {
            data[field] = body[field];
        }
    }
    return data;
};

exports.getAllParts = async (req, res, next) => {
    try {
        const { page, limit } = req.query;
        const query = { companyId: req.user.companyId };

        if (page || limit) {
            const pageNum = Math.max(1, parseInt(page, 10) || DEFAULT_PAGE);
            const limitNum = Math.max(1, Math.min(MAX_LIMIT, parseInt(limit, 10) || DEFAULT_LIMIT));
            const skip = (pageNum - 1) * limitNum;

            const [parts, total] = await Promise.all([
                Part.find(query)
                    .populate('tool', 'name serialNumber model')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limitNum),
                Part.countDocuments(query),
            ]);

            return res.json({
                parts,
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum),
            });
        }

        const parts = await Part.find(query)
            .populate('tool', 'name serialNumber model')
            .sort({ createdAt: -1 });

        res.json(parts);
    } catch (err) {
        next(err);
    }
};

exports.createPart = async (req, res, next) => {
    try {
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({ message: 'No data provided' });
        }

        const data = filterPartFields(req.body);
        if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
            return res.status(400).json({ message: 'Part name is required' });
        }

        if (data.tool) {
            const toolExists = await Tool.findOne({ _id: data.tool, companyId: req.user.companyId });
            if (!toolExists) {
                return res.status(400).json({ message: 'Referenced tool does not exist in your organization' });
            }
        }

        const part = await Part.create({
            ...data,
            name: data.name.trim(),
            companyId: req.user.companyId,
        });

        res.status(201).json(part);
    } catch (err) {
        next(err);
    }
};

exports.updatePart = async (req, res, next) => {
    try {
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({ message: 'No data provided' });
        }

        const updates = filterPartFields(req.body);
        if (updates.name !== undefined && (typeof updates.name !== 'string' || updates.name.trim().length === 0)) {
            return res.status(400).json({ message: 'Part name cannot be empty' });
        }
        if (updates.name) {
            updates.name = updates.name.trim();
        }

        if (updates.tool) {
            const toolExists = await Tool.findOne({ _id: updates.tool, companyId: req.user.companyId });
            if (!toolExists) {
                return res.status(400).json({ message: 'Referenced tool does not exist in your organization' });
            }
        }

        const part = await Part.findOneAndUpdate(
            { _id: req.params.id, companyId: req.user.companyId },
            updates,
            { new: true, runValidators: true }
        ).populate('tool', 'name serialNumber model');

        if (!part) {
            return res.status(404).json({ message: 'Part not found' });
        }

        res.json(part);
    } catch (err) {
        next(err);
    }
};

exports.deletePart = async (req, res, next) => {
    try {
        const part = await Part.findOneAndDelete({
            _id: req.params.id,
            companyId: req.user.companyId,
        });

        if (!part) {
            return res.status(404).json({ message: 'Part not found' });
        }

        res.json({ message: 'Part deleted successfully' });
    } catch (err) {
        next(err);
    }
};