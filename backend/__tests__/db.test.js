jest.mock('mongoose', () => ({
    set: jest.fn(),
    connect: jest.fn(),
}));
jest.mock('../utils/logger', () => ({ info: jest.fn(), error: jest.fn() }));

describe('config/db connectDB', () => {
    let mongoose;
    let logger;
    let processExitSpy;

    beforeEach(() => {
        jest.resetModules();
        mongoose = require('mongoose');
        logger = require('../utils/logger');
        processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.clearAllMocks();
        processExitSpy.mockRestore();
    });

    it('connects successfully and logs a confirmation', async () => {
        mongoose.connect.mockResolvedValueOnce(undefined);
        const connectDB = require('../config/db');

        await connectDB();

        expect(mongoose.set).toHaveBeenCalledWith('sanitizeFilter', true);
        expect(mongoose.connect).toHaveBeenCalledWith(process.env.MONGO_URI);
        expect(logger.info).toHaveBeenCalledWith('MongoDB connected');
        expect(processExitSpy).not.toHaveBeenCalled();
    });

    it('logs the error and exits the process when connection fails', async () => {
        const connectionError = new Error('connection refused');
        mongoose.connect.mockRejectedValueOnce(connectionError);
        const connectDB = require('../config/db');

        await connectDB();

        expect(logger.error).toHaveBeenCalledWith('MongoDB connection error', connectionError);
        expect(processExitSpy).toHaveBeenCalledWith(1);
    });
});
