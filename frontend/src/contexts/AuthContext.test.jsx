// src/contexts/AuthContext.test.jsx
import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import apiClient from '../services/apiClient';
import { ROUTES } from '../constants/routes';

jest.mock('../services/apiClient', () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
        post: jest.fn(),
        setToken: jest.fn(),
    },
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}));

function Consumer() {
    const { user, loading } = useAuth();
    return (
        <div>
            <span data-testid="user">{user ? user.name : 'none'}</span>
            <span data-testid="loading">{String(loading)}</span>
        </div>
    );
}

// Generic harness: exposes the raw context so a test can call any method
// and observe the resulting error/result without hand-writing one harness
// component per method.
function ActionHarness({ action }) {
    const ctx = useAuth();
    const [error, setError] = React.useState('');
    const [ran, setRan] = React.useState(false);
    return (
        <div>
            <button
                onClick={async () => {
                    setError('');
                    try {
                        await action(ctx);
                    } catch (e) {
                        setError(e.message);
                    } finally {
                        setRan(true);
                    }
                }}
            >
                run
            </button>
            <span data-testid="error">{error}</span>
            <span data-testid="ran">{String(ran)}</span>
            <span data-testid="user">{ctx.user ? ctx.user.name : 'none'}</span>
            <span data-testid="loginPassword">{ctx.loginPassword}</span>
        </div>
    );
}

function renderWithProvider(ui) {
    return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('AuthContext', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('mount bootstrap', () => {
        it('loads and sanitizes the current user when a session is valid', async () => {
            apiClient.get.mockResolvedValueOnce({ data: { id: '1', name: 'john doe', role: 'admin' } });
            renderWithProvider(<AuthProvider><Consumer /></AuthProvider>);

            await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
            expect(apiClient.get).toHaveBeenCalledWith('/auth/me');
            expect(screen.getByTestId('user').textContent).toBe('John Doe');
        });

        it('clears auth state when there is no valid session', async () => {
            apiClient.get.mockRejectedValueOnce(new Error('unauthenticated'));
            renderWithProvider(<AuthProvider><Consumer /></AuthProvider>);

            await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
            expect(apiClient.setToken).toHaveBeenCalledWith(null);
            expect(screen.getByTestId('user').textContent).toBe('none');
        });
    });

    describe('login', () => {
        beforeEach(() => {
            apiClient.get.mockRejectedValueOnce(new Error('no session'));
        });

        it('stores the token, sets the sanitized user, and navigates to the dashboard', async () => {
            apiClient.post.mockResolvedValueOnce({
                data: { accessToken: 'tok123', user: { id: '1', name: 'jane doe', role: 'operator' } },
            });
            renderWithProvider(
                <AuthProvider>
                    <ActionHarness action={(ctx) => ctx.login('a@b.com', 'secret')} />
                </AuthProvider>
            );
            await waitFor(() => expect(apiClient.get).toHaveBeenCalled());

            fireEvent.click(screen.getByText('run'));
            await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('Jane Doe'));

            expect(apiClient.post).toHaveBeenCalledWith('/auth/login', { email: 'a@b.com', password: 'secret' });
            expect(apiClient.setToken).toHaveBeenCalledWith('tok123');
            expect(mockNavigate).toHaveBeenCalledWith(ROUTES.DASHBOARD);
        });

        it('accepts a single credentials object', async () => {
            apiClient.post.mockResolvedValueOnce({
                data: { accessToken: 'tok', user: { id: '1', name: 'jane', role: 'operator' } },
            });
            renderWithProvider(
                <AuthProvider>
                    <ActionHarness action={(ctx) => ctx.login({ email: 'a@b.com', password: 'secret' })} />
                </AuthProvider>
            );
            await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
            fireEvent.click(screen.getByText('run'));
            await waitFor(() => expect(screen.getByTestId('ran').textContent).toBe('true'));
            expect(apiClient.post).toHaveBeenCalledWith('/auth/login', { email: 'a@b.com', password: 'secret' });
        });

        it('redirects to force-password-change when the server flags mustChangePassword', async () => {
            apiClient.post.mockResolvedValueOnce({
                data: { accessToken: 't', user: { id: '1', name: 'jane', mustChangePassword: true } },
            });
            renderWithProvider(
                <AuthProvider>
                    <ActionHarness action={(ctx) => ctx.login('a@b.com', 'secret')} />
                </AuthProvider>
            );
            await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
            fireEvent.click(screen.getByText('run'));
            await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith(ROUTES.FORCE_PASSWORD_CHANGE, { replace: true }));
        });

        it('throws a server-provided error message and clears the entered password on failure', async () => {
            apiClient.post.mockRejectedValueOnce({ response: { data: { message: 'Bad credentials' } } });
            renderWithProvider(
                <AuthProvider>
                    <ActionHarness action={(ctx) => ctx.login('a@b.com', 'wrong')} />
                </AuthProvider>
            );
            await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
            fireEvent.click(screen.getByText('run'));
            await waitFor(() => expect(screen.getByTestId('error').textContent).toBe('Bad credentials'));
            expect(screen.getByTestId('loginPassword').textContent).toBe('');
        });

        it('falls back to a generic error message when the server sends none', async () => {
            apiClient.post.mockRejectedValueOnce(new Error('network down'));
            renderWithProvider(
                <AuthProvider>
                    <ActionHarness action={(ctx) => ctx.login('a@b.com', 'wrong')} />
                </AuthProvider>
            );
            await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
            fireEvent.click(screen.getByText('run'));
            await waitFor(() => expect(screen.getByTestId('error').textContent).toBe('Login failed, please try again later'));
        });
    });

    describe('signup', () => {
        beforeEach(() => {
            apiClient.get.mockRejectedValueOnce(new Error('no session'));
        });

        it('registers the company, sets the user, and navigates to the dashboard', async () => {
            apiClient.post.mockResolvedValueOnce({
                data: { accessToken: 'tok', user: { id: '1', name: 'admin user', role: 'admin' } },
            });
            renderWithProvider(
                <AuthProvider>
                    <ActionHarness
                        action={(ctx) => ctx.signup({
                            companyName: 'Acme', name: 'admin user', email: 'a@acme.com', password: 'secret123', agreeToTerms: true,
                        })}
                    />
                </AuthProvider>
            );
            await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
            fireEvent.click(screen.getByText('run'));
            await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('Admin User'));
            expect(apiClient.post).toHaveBeenCalledWith('/auth/register', {
                companyName: 'Acme', name: 'Admin User', email: 'a@acme.com', password: 'secret123', agreeToTerms: true,
            });
            expect(mockNavigate).toHaveBeenCalledWith(ROUTES.DASHBOARD);
        });

        it('throws a server-provided error message on failure', async () => {
            apiClient.post.mockRejectedValueOnce({ response: { data: { message: 'Email taken' } } });
            renderWithProvider(
                <AuthProvider>
                    <ActionHarness
                        action={(ctx) => ctx.signup({ companyName: 'Acme', name: 'x', email: 'a@acme.com', password: 'secret123' })}
                    />
                </AuthProvider>
            );
            await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
            fireEvent.click(screen.getByText('run'));
            await waitFor(() => expect(screen.getByTestId('error').textContent).toBe('Email taken'));
        });
    });

    describe('logout', () => {
        it('clears the token/user and navigates to login even if the server call fails', async () => {
            apiClient.get.mockResolvedValueOnce({ data: { id: '1', name: 'jane', role: 'operator' } });
            apiClient.post.mockRejectedValueOnce(new Error('server error'));
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            renderWithProvider(
                <AuthProvider>
                    <ActionHarness action={(ctx) => ctx.logout()} />
                </AuthProvider>
            );
            await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('Jane'));

            fireEvent.click(screen.getByText('run'));
            await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('none'));
            expect(apiClient.setToken).toHaveBeenCalledWith(null);
            expect(mockNavigate).toHaveBeenCalledWith(ROUTES.LOGIN);

            consoleSpy.mockRestore();
        });
    });

    describe('updateAvatar', () => {
        it('uploads the file as multipart form data and updates the user', async () => {
            apiClient.get.mockRejectedValueOnce(new Error('no session'));
            apiClient.post.mockResolvedValueOnce({ data: { id: '1', name: 'jane', avatarUrl: '/x.png' } });
            const file = new File(['x'], 'avatar.png', { type: 'image/png' });

            renderWithProvider(
                <AuthProvider>
                    <ActionHarness action={(ctx) => ctx.updateAvatar(file)} />
                </AuthProvider>
            );
            await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
            fireEvent.click(screen.getByText('run'));
            await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('Jane'));

            const [url, formData, config] = apiClient.post.mock.calls[0];
            expect(url).toBe('/auth/me/avatar');
            expect(formData.get('avatar')).toBe(file);
            expect(config).toEqual({ headers: { 'Content-Type': 'multipart/form-data' } });
        });
    });

    describe('setUser / clearLoginPassword', () => {
        it('setUser sanitizes (formats the name of) whatever is passed in', async () => {
            apiClient.get.mockRejectedValueOnce(new Error('no session'));
            renderWithProvider(
                <AuthProvider>
                    <ActionHarness action={(ctx) => ctx.setUser({ id: '1', name: 'bob smith' })} />
                </AuthProvider>
            );
            await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
            fireEvent.click(screen.getByText('run'));
            await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('Bob Smith'));
        });

        it('setUser supports a functional updater', async () => {
            apiClient.get.mockResolvedValueOnce({ data: { id: '1', name: 'jane', role: 'operator', mustChangePassword: true } });
            renderWithProvider(
                <AuthProvider>
                    <ActionHarness action={(ctx) => ctx.setUser((prev) => ({ ...prev, mustChangePassword: false }))} />
                </AuthProvider>
            );
            await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('Jane'));
            fireEvent.click(screen.getByText('run'));
            await waitFor(() => expect(screen.getByTestId('ran').textContent).toBe('true'));
        });

        it('clearLoginPassword empties the stored login password', async () => {
            apiClient.get.mockRejectedValueOnce(new Error('no session'));
            apiClient.post.mockResolvedValueOnce({ data: { user: { id: '1', name: 'jane' } } });
            renderWithProvider(
                <AuthProvider>
                    <ActionHarness action={async (ctx) => {
                        await ctx.login('a@b.com', 'secret');
                        ctx.clearLoginPassword();
                    }}
                    />
                </AuthProvider>
            );
            await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
            fireEvent.click(screen.getByText('run'));
            await waitFor(() => expect(screen.getByTestId('loginPassword').textContent).toBe(''));
        });
    });

    describe('provider value memoization (regression: useMemo/useCallback refactor)', () => {
        it('keeps the same value reference across an unrelated parent re-render, but produces a new one when state actually changes', async () => {
            apiClient.get.mockRejectedValueOnce(new Error('no session'));
            apiClient.post.mockResolvedValueOnce({ data: { accessToken: 't', user: { id: '1', name: 'jane' } } });

            const captured = [];
            function Capture() {
                const value = useAuth();
                captured.push(value);
                return null;
            }
            function Harness() {
                const [tick, setTick] = React.useState(0);
                return (
                    <>
                        <AuthProvider><Capture /></AuthProvider>
                        <button onClick={() => setTick((t) => t + 1)}>tick-{tick}</button>
                    </>
                );
            }

            renderWithProvider(<Harness />);
            await waitFor(() => expect(captured[captured.length - 1].loading).toBe(false));

            const stableValue = captured[captured.length - 1];
            captured.length = 0;

            // Force the parent (and thus AuthProvider) to re-render without touching any auth state.
            fireEvent.click(screen.getByText(/tick-/));
            await waitFor(() => expect(captured.length).toBeGreaterThan(0));
            expect(captured[captured.length - 1]).toBe(stableValue);

            // Now actually change auth state — the value must be a new reference.
            await act(async () => {
                await stableValue.login('a@b.com', 'secret');
            });
            expect(captured[captured.length - 1]).not.toBe(stableValue);
        });
    });

    describe('useAuth guard', () => {
        it('throws when used outside an AuthProvider', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            const Bad = () => { useAuth(); return null; };
            expect(() => render(<Bad />)).toThrow('useAuth must be used within AuthProvider');
            consoleSpy.mockRestore();
        });
    });
});
