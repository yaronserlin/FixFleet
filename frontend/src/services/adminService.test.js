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
import adminService from './adminService';

const resolveWithData = (data) => Promise.resolve({ data });

describe('adminService', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('getUsers calls GET /admin/users and returns data', async () => {
        apiClient.get.mockReturnValueOnce(resolveWithData([{ _id: '1' }]));
        const result = await adminService.getUsers();
        expect(apiClient.get).toHaveBeenCalledWith('/admin/users');
        expect(result).toEqual([{ _id: '1' }]);
    });

    it('createUser posts to /admin/users with the payload', async () => {
        apiClient.post.mockReturnValueOnce(resolveWithData({ _id: '1' }));
        const userData = { name: 'A', email: 'a@a.com', password: 'password1', role: 'operator' };
        await adminService.createUser(userData);
        expect(apiClient.post).toHaveBeenCalledWith('/admin/users', userData);
    });

    it('updateUserRole patches the role endpoint with { role }', async () => {
        apiClient.patch.mockReturnValueOnce(resolveWithData({}));
        await adminService.updateUserRole('u1', 'mechanic');
        expect(apiClient.patch).toHaveBeenCalledWith('/admin/users/u1/role', { role: 'mechanic' });
    });

    it('deleteUser calls DELETE /admin/users/:id and returns nothing', async () => {
        apiClient.delete.mockReturnValueOnce(resolveWithData(undefined));
        const result = await adminService.deleteUser('u1');
        expect(apiClient.delete).toHaveBeenCalledWith('/admin/users/u1');
        expect(result).toBeUndefined();
    });
});
