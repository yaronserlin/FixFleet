// src/components/AccessibilityMenu/AccessibilityMenu.test.jsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AccessibilityMenu from './AccessibilityMenu';
import { computeBottomOffset, STORAGE_KEY } from './accessibilityPrefs';

describe('computeBottomOffset', () => {
    test('uses the base gap when nothing is on screen', () => {
        expect(computeBottomOffset([], 800)).toBe(16);
        expect(computeBottomOffset([{ top: 900, bottom: 960 }], 800)).toBe(16);
    });

    test('lifts above a visible bottom nav bar', () => {
        expect(computeBottomOffset([{ top: 736, bottom: 800 }], 800)).toBe(80);
    });

    test('clears the tallest of several obstacles', () => {
        expect(computeBottomOffset([{ top: 736, bottom: 800 }, { top: 650, bottom: 700 }], 800)).toBe(166);
    });
});

describe('AccessibilityMenu', () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.className = '';
        document.documentElement.style.fontSize = '';
    });

    test('opens, applies and persists preferences, and resets', () => {
        render(<AccessibilityMenu />);
        fireEvent.click(screen.getByRole('button', { name: /open accessibility menu/i }));
        expect(screen.getByRole('dialog', { name: /accessibility options/i })).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /increase text size/i }));
        expect(document.documentElement.style.fontSize).toBe('110%');

        fireEvent.click(screen.getByLabelText(/high contrast/i));
        expect(document.documentElement.classList.contains('a11y-high-contrast')).toBe(true);

        fireEvent.click(screen.getByLabelText(/underline links/i));
        expect(document.documentElement.classList.contains('a11y-underline-links')).toBe(true);
        expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toMatchObject({
            fontStep: 1, highContrast: true, underlineLinks: true,
        });

        fireEvent.click(screen.getByRole('button', { name: /reset/i }));
        expect(document.documentElement.style.fontSize).toBe('100%');
        expect(document.documentElement.classList.contains('a11y-high-contrast')).toBe(false);
    });

    test('restores saved preferences on load and closes with Escape', () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ fontStep: 3, highContrast: true }));
        render(<AccessibilityMenu />);
        expect(document.documentElement.style.fontSize).toBe('150%');
        expect(document.documentElement.classList.contains('a11y-high-contrast')).toBe(true);

        fireEvent.click(screen.getByRole('button', { name: /open accessibility menu/i }));
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
});
