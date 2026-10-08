// config/db.js
const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
    try {
        mongoose.set('sanitizeFilter', true);
        await mongoose.connect(process.env.MONGO_URI);
        logger.info('MongoDB connected');
    } catch (error) {
        logger.error('MongoDB connection error', error);
        process.exit(1);
    }
};

module.exports = connectDB;