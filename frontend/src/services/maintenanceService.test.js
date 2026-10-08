jest.mock('./apiClient', () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
        post: jest.fn(),
        delete: jest.fn(),
    },
}));

import apiClient from './apiClient';
import maintenanceService from './maintenanceService';

const resolveWithData = (data) => Promise.resolve({ data });

describe('maintenanceService', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('getMaintenance calls GET /maintenance with query parameters', async () => {
        apiClient.get.mockReturnValueOnce(resolveWithData([{ _id: 'm1' }]));
        const result = await maintenanceService.getMaintenance({ toolId: 'tool-123' });
        expect(apiClient.get).toHaveBeenCalledWith('/maintenance', { params: { toolId: 'tool-123' } });
        expect(result).toEqual([{ _id: 'm1' }]);
    });

    it('deleteMaintenance calls DELETE /maintenance/:id', async () => {
        apiClient.delete.mockReturnValueOnce(resolveWithData({ message: 'Deleted' }));
        const result = await maintenanceService.deleteMaintenance('m1');
        expect(apiClient.delete).toHaveBeenCalledWith('/maintenance/m1');
        expect(result).toEqual({ message: 'Deleted' });
    });
});
