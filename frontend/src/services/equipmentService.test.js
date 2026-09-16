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
import equipmentService from './equipmentService';
import toolsService from './toolsService';

const resolveWithData = (data) => Promise.resolve({ data });

describe('equipmentService', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('toolsService re-exports equipmentService for backward compatibility', () => {
        expect(toolsService).toBe(equipmentService);
    });

    it('getAll resolves with response data', async () => {
        apiClient.get.mockReturnValueOnce(resolveWithData([{ _id: '1' }]));
        const result = await equipmentService.getAll();
        expect(apiClient.get).toHaveBeenCalledWith('/equipment');
        expect(result).toEqual([{ _id: '1' }]);
    });

    it('getById calls GET /equipment/:id', async () => {
        apiClient.get.mockReturnValueOnce(resolveWithData({ _id: '1' }));
        await equipmentService.getById('1');
        expect(apiClient.get).toHaveBeenCalledWith('/equipment/1');
    });

    it('create calls POST /equipment with the payload', async () => {
        apiClient.post.mockReturnValueOnce(resolveWithData({ _id: '1' }));
        await equipmentService.create({ name: 'Drill' });
        expect(apiClient.post).toHaveBeenCalledWith('/equipment', { name: 'Drill' });
    });

    it('update calls PUT /equipment/:id with the payload', async () => {
        apiClient.put.mockReturnValueOnce(resolveWithData({ _id: '1' }));
        await equipmentService.update('1', { name: 'Renamed' });
        expect(apiClient.put).toHaveBeenCalledWith('/equipment/1', { name: 'Renamed' });
    });

    it('delete calls DELETE /equipment/:id', async () => {
        apiClient.delete.mockReturnValueOnce(resolveWithData(undefined));
        await equipmentService.delete('1');
        expect(apiClient.delete).toHaveBeenCalledWith('/equipment/1');
    });

    it('uploadBook posts multipart form data to /equipment/:id/books', async () => {
        apiClient.post.mockReturnValueOnce(resolveWithData({}));
        const formData = new FormData();
        await equipmentService.uploadBook('1', formData);
        expect(apiClient.post).toHaveBeenCalledWith('/equipment/1/books', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 3 * 60 * 1000,
            onUploadProgress: undefined,
        });
    });

    it('uploadBook forwards an onUploadProgress callback for a progress indicator', async () => {
        apiClient.post.mockReturnValueOnce(resolveWithData({}));
        const formData = new FormData();
        const onUploadProgress = jest.fn();
        await equipmentService.uploadBook('1', formData, { onUploadProgress });
        expect(apiClient.post).toHaveBeenCalledWith('/equipment/1/books', formData, expect.objectContaining({
            onUploadProgress,
        }));
    });

    it('deleteBook calls DELETE /equipment/:id/books/:bookId', async () => {
        apiClient.delete.mockReturnValueOnce(resolveWithData({}));
        await equipmentService.deleteBook('1', 'b1');
        expect(apiClient.delete).toHaveBeenCalledWith('/equipment/1/books/b1');
    });

    it('addSchedule posts to /equipment/:id/schedules', async () => {
        apiClient.post.mockReturnValueOnce(resolveWithData({}));
        await equipmentService.addSchedule('1', { title: 'Oil change' });
        expect(apiClient.post).toHaveBeenCalledWith('/equipment/1/schedules', { title: 'Oil change' });
    });

    it('deleteSchedule calls DELETE /equipment/:id/schedules/:scheduleId', async () => {
        apiClient.delete.mockReturnValueOnce(resolveWithData({}));
        await equipmentService.deleteSchedule('1', 's1');
        expect(apiClient.delete).toHaveBeenCalledWith('/equipment/1/schedules/s1');
    });

    it('completeSchedule posts to the complete endpoint', async () => {
        apiClient.post.mockReturnValueOnce(resolveWithData({}));
        await equipmentService.completeSchedule('1', 's1', { notes: 'done' });
        expect(apiClient.post).toHaveBeenCalledWith('/equipment/1/schedules/s1/complete', { notes: 'done' });
    });

    it('getSchedule calls GET on the schedule endpoint', async () => {
        apiClient.get.mockReturnValueOnce(resolveWithData({}));
        await equipmentService.getSchedule('1', 's1');
        expect(apiClient.get).toHaveBeenCalledWith('/equipment/1/schedules/s1');
    });

    it('addChecklistItem posts { text } to the checklist endpoint', async () => {
        apiClient.post.mockReturnValueOnce(resolveWithData({}));
        await equipmentService.addChecklistItem('1', 's1', 'Check oil');
        expect(apiClient.post).toHaveBeenCalledWith('/equipment/1/schedules/s1/checklist', { text: 'Check oil' });
    });

    it('toggleChecklistItem patches the checklist item endpoint', async () => {
        apiClient.patch.mockReturnValueOnce(resolveWithData({}));
        await equipmentService.toggleChecklistItem('1', 's1', 'i1');
        expect(apiClient.patch).toHaveBeenCalledWith('/equipment/1/schedules/s1/checklist/i1');
    });

    it('deleteChecklistItem deletes the checklist item endpoint', async () => {
        apiClient.delete.mockReturnValueOnce(resolveWithData({}));
        await equipmentService.deleteChecklistItem('1', 's1', 'i1');
        expect(apiClient.delete).toHaveBeenCalledWith('/equipment/1/schedules/s1/checklist/i1');
    });
});
