// src/hooks/useAuthenticatedBlobUrl.test.js
import { renderHook, waitFor } from '@testing-library/react';
import apiClient from '../services/apiClient';
import { useAuthenticatedBlobUrl } from './useAuthenticatedBlobUrl';

jest.mock('../services/apiClient', () => ({ __esModule: true, default: { get: jest.fn() } }));

describe('useAuthenticatedBlobUrl', () => {
    beforeEach(() => {
        apiClient.get.mockReset();
        global.URL.createObjectURL = jest.fn(() => 'blob:local/1');
        global.URL.revokeObjectURL = jest.fn();
    });

    it('never sends the token to an external origin', async () => {
        const { result } = renderHook(() => useAuthenticatedBlobUrl('https://attacker.example/x.png'));
        await waitFor(() => expect(result.current.error).toBeTruthy());
        expect(apiClient.get).not.toHaveBeenCalled();
    });

    it('fetches same-origin media through apiClient', async () => {
        apiClient.get.mockResolvedValue({ data: new Blob(['x']) });
        const { result } = renderHook(() => useAuthenticatedBlobUrl('/uploads/abc'));
        await waitFor(() => expect(result.current.blobUrl).toBe('blob:local/1'));
        expect(apiClient.get).toHaveBeenCalledWith('/uploads/abc', { baseURL: '', responseType: 'blob' });
    });
});
