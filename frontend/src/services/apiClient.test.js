jest.mock('axios', () => {
    const mockInstance = jest.fn((config) => Promise.resolve({ data: 'retried', config }));
    mockInstance.defaults = { headers: { common: {} } };
    mockInstance.interceptors = {
        response: { use: jest.fn() },
    };
    mockInstance.get = jest.fn();
    mockInstance.post = jest.fn();
    mockInstance.put = jest.fn();
    mockInstance.patch = jest.fn();
    mockInstance.delete = jest.fn();
    return {
        __esModule: true,
        default: {
            create: jest.fn(() => mockInstance),
            post: jest.fn().mockRejectedValue(new Error('Refresh failed')),
        },
    };
});

describe('apiClient', () => {
    afterEach(() => {
        jest.resetModules();
    });

    it('sets and clears the Authorization header via setToken', () => {
        const apiClient = require('./apiClient').default;

        apiClient.setToken('abc123');
        expect(apiClient.defaults.headers.common['Authorization']).toBe('Bearer abc123');

        apiClient.setToken(null);
        expect(apiClient.defaults.headers.common['Authorization']).toBeUndefined();
    });

    it('registers a response interceptor', () => {
        const apiClient = require('./apiClient').default;
        expect(apiClient.interceptors.response.use).toHaveBeenCalledTimes(1);
    });

    it('only redirects to login from non-public pages', () => {
        const { shouldRedirectToLogin } = require('./apiClient');
        expect(shouldRedirectToLogin('/dashboard')).toBe(true);
        expect(shouldRedirectToLogin('/login')).toBe(false);
        expect(shouldRedirectToLogin('/reset-password')).toBe(false);
        expect(shouldRedirectToLogin('/terms')).toBe(false);
        expect(shouldRedirectToLogin('/')).toBe(false);
        expect(shouldRedirectToLogin('/accessibility')).toBe(false);
        expect(shouldRedirectToLogin('/signup')).toBe(false);
        expect(shouldRedirectToLogin('/guide')).toBe(false);
    });

    describe('401 interceptor behavior', () => {
        // jsdom does not implement real navigation, and jsdom 26+ makes
        // `window.location` non-configurable, so the href-assignment side
        // effect itself cannot be observed here. These tests instead pin
        // down the branch logic (which errors are swallowed vs. rethrown)
        // and use history.pushState to control window.location.pathname,
        // which jsdom does support without triggering navigation.
        let successHandler;
        let errorHandler;
        let consoleErrorSpy;

        beforeEach(() => {
            jest.resetModules();
            window.history.pushState(null, '', '/dashboard');
            consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            const apiClient = require('./apiClient').default;
            [successHandler, errorHandler] = apiClient.interceptors.response.use.mock.calls[0];
        });

        afterEach(() => {
            consoleErrorSpy.mockRestore();
        });

        it('passes through successful responses unchanged', () => {
            const response = { data: 'ok' };
            expect(successHandler(response)).toBe(response);
        });

        it('rejects with the original error on a 401 from a non-auth route', async () => {
            const error = { response: { status: 401 }, config: { url: '/equipment' } };
            await expect(errorHandler(error)).rejects.toBe(error);
        });

        it('rejects with the original error for a 401 from the login endpoint itself', async () => {
            const error = { response: { status: 401 }, config: { url: '/auth/login' } };
            await expect(errorHandler(error)).rejects.toBe(error);
        });

        it('rejects with the original error when already on the /login page', async () => {
            window.history.pushState(null, '', '/login');
            const error = { response: { status: 401 }, config: { url: '/equipment' } };
            await expect(errorHandler(error)).rejects.toBe(error);
        });

        it('rejects with the original error for non-401 errors without redirecting', async () => {
            const error = { response: { status: 500 }, config: { url: '/equipment' } };
            await expect(errorHandler(error)).rejects.toBe(error);
        });

        it('does not throw when the error has no response object', async () => {
            const error = { message: 'Network Error' };
            await expect(errorHandler(error)).rejects.toBe(error);
        });

        it('refreshes token successfully and retries request on 401', async () => {
            const axios = require('axios').default;
            axios.post.mockResolvedValueOnce({
                data: { accessToken: 'new-token-xyz' },
            });

            const error = {
                response: { status: 401 },
                config: { url: '/equipment', headers: {} },
            };

            await errorHandler(error);
            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/auth/refresh'),
                {},
                { withCredentials: true }
            );
            expect(error.config.headers['Authorization']).toBe('Bearer new-token-xyz');
        });
    });

    describe('normalizeApiError', () => {
        const { normalizeApiError, API_ERROR_EVENT } = require('./apiClient');
        let heard;
        const listener = (e) => heard.push(e.detail);
        beforeEach(() => { heard = []; window.addEventListener(API_ERROR_EVENT, listener); });
        afterEach(() => window.removeEventListener(API_ERROR_EVENT, listener));

        it('broadcasts a friendly message when the server is unreachable', () => {
            const err = normalizeApiError({ message: 'Network Error' });
            expect(err.message).toMatch(/can't reach the server/i);
            expect(heard).toEqual([err.message]);
        });

        it('broadcasts a generic message for 5xx', () => {
            const err = normalizeApiError({ response: { status: 503, data: { message: 'stack trace' } } });
            expect(err.message).toMatch(/server error/i);
            expect(heard).toHaveLength(1);
        });

        it('uses the server message for 4xx without broadcasting', () => {
            const err = normalizeApiError({ message: 'x', response: { status: 400, data: { message: 'Bad field' } } });
            expect(err.message).toBe('Bad field');
            expect(heard).toHaveLength(0);
        });

        it('ignores aborted requests', () => {
            normalizeApiError({ code: 'ERR_CANCELED', message: 'canceled' });
            expect(heard).toHaveLength(0);
        });
    });
});
