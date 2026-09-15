// src/services/toolsService.test.js
//
// toolsService.js is a pure backward-compatibility re-export of
// equipmentService (see equipmentService.js). Its actual HTTP behavior is
// exhaustively covered by equipmentService.test.js; these tests pin down
// the re-export contract itself, plus a couple of spot-checks that calling
// through the toolsService name still reaches the mocked apiClient
// correctly (following the same mocking pattern as equipmentService.test.js
// / faultsService.test.js).
jest.mock('./apiClient', () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        patch: jest.fn(),
        delete: jest.fn(),
    },
}));

import apiClient from './apiClient';
import toolsService from './toolsService';
import equipmentService from './equipmentService';

const resolveWithData = (data) => Promise.resolve({ data });

describe('toolsService', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('is the exact same object as equipmentService (backward-compatible alias)', () => {
        expect(toolsService).toBe(equipmentService);
    });

    it('exposes the full equipmentService API surface', () => {
        [
            'getAll', 'getById', 'create', 'update', 'delete',
            'uploadBook', 'deleteBook',
            'addSchedule', 'deleteSchedule', 'completeSchedule', 'getSchedule',
            'addChecklistItem', 'toggleChecklistItem', 'deleteChecklistItem',
            'updateScheduleProgress',
        ].forEach((method) => {
            expect(typeof toolsService[method]).toBe('function');
        });
    });

    it('getAll calls GET /equipment through the shared apiClient', async () => {
        apiClient.get.mockReturnValueOnce(resolveWithData([{ _id: '1' }]));
        const result = await toolsService.getAll();
        expect(apiClient.get).toHaveBeenCalledWith('/equipment');
        expect(result).toEqual([{ _id: '1' }]);
    });

    it('create calls POST /equipment with the payload', async () => {
        apiClient.post.mockReturnValueOnce(resolveWithData({ _id: '1' }));
        await toolsService.create({ name: 'Drill' });
        expect(apiClient.post).toHaveBeenCalledWith('/equipment', { name: 'Drill' });
    });

    it('delete calls DELETE /equipment/:id', async () => {
        apiClient.delete.mockReturnValueOnce(resolveWithData(undefined));
        await toolsService.delete('1');
        expect(apiClient.delete).toHaveBeenCalledWith('/equipment/1');
    });
});
