// src/contexts/ThemeContext.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ThemeModeProvider, useThemeMode } from './ThemeContext';

function mockMatchMedia(prefersDark) {
    window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: prefersDark && query.includes('dark'),
        media: query,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    }));
}

function Consumer() {
    const { mode, toggleColorMode } = useThemeMode();
    return (
        <div>
            <span data-testid="mode">{mode}</span>
            <button onClick={toggleColorMode}>toggle</button>
        </div>
    );
}

describe('ThemeContext', () => {
    beforeEach(() => {
        localStorage.clear();
        mockMatchMedia(false);
    });

    it('defaults to light mode when nothing is stored and the system has no dark preference', () => {
        render(<ThemeModeProvider><Consumer /></ThemeModeProvider>);
        expect(screen.getByTestId('mode').textContent).toBe('light');
    });

    it('honors a stored preference over the system setting', () => {
        localStorage.setItem('maintenance_app_theme', 'dark');
        render(<ThemeModeProvider><Consumer /></ThemeModeProvider>);
        expect(screen.getByTestId('mode').textContent).toBe('dark');
    });

    it('falls back to the system dark-mode preference when nothing is stored', () => {
        mockMatchMedia(true);
        render(<ThemeModeProvider><Consumer /></ThemeModeProvider>);
        expect(screen.getByTestId('mode').textContent).toBe('dark');
    });

    it('toggleColorMode flips the mode and persists it to localStorage / documentElement', async () => {
        render(<ThemeModeProvider><Consumer /></ThemeModeProvider>);
        expect(screen.getByTestId('mode').textContent).toBe('light');

        fireEvent.click(screen.getByText('toggle'));

        expect(screen.getByTestId('mode').textContent).toBe('dark');
        await waitFor(() => expect(localStorage.getItem('maintenance_app_theme')).toBe('dark'));
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

        fireEvent.click(screen.getByText('toggle'));
        expect(screen.getByTestId('mode').textContent).toBe('light');
        await waitFor(() => expect(localStorage.getItem('maintenance_app_theme')).toBe('light'));
    });

    describe('provider value memoization', () => {
        it('keeps the same value reference across an unrelated parent re-render, but produces a new one on toggle', () => {
            const captured = [];
            function Capture() {
                const value = useThemeMode();
                captured.push(value);
                return null;
            }
            function Harness() {
                const [tick, setTick] = React.useState(0);
                return (
                    <>
                        <ThemeModeProvider><Capture /></ThemeModeProvider>
                        <button onClick={() => setTick((t) => t + 1)}>tick-{tick}</button>
                    </>
                );
            }

            render(<Harness />);
            const stableValue = captured[captured.length - 1];
            captured.length = 0;

            fireEvent.click(screen.getByText(/tick-/));
            expect(captured[captured.length - 1]).toBe(stableValue);

            act(() => { stableValue.toggleColorMode(); });
            expect(captured[captured.length - 1]).not.toBe(stableValue);
            expect(captured[captured.length - 1].mode).toBe('dark');
        });
    });

    describe('useThemeMode outside a provider', () => {
        // Unlike AuthContext/NotificationContext/etc., ThemeContext is created
        // with a non-undefined default value ({ mode: 'light', toggleColorMode })
        // as a safety net, so the `if (!context) throw` guard in useThemeMode
        // never actually fires — it falls back to that default instead.
        it('falls back to the light-mode default rather than throwing', () => {
            const Bad = () => {
                const { mode } = useThemeMode();
                return <span data-testid="fallback-mode">{mode}</span>;
            };
            render(<Bad />);
            expect(screen.getByTestId('fallback-mode').textContent).toBe('light');
        });
    });
});
