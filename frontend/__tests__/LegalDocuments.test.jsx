// __tests__/LegalDocuments.test.jsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LegalModal from '../src/components/Legal/LegalModal';
import { TERMS_OF_SERVICE, TERMS_OF_SERVICE_HE, PRIVACY_POLICY, PRIVACY_POLICY_HE, ACCESSIBILITY_STATEMENT, ACCESSIBILITY_STATEMENT_HE, LEGAL_DOCS } from '../src/content/legalDocuments';

describe('LegalModal and Legal Documents', () => {
    test('renders Terms of Service by default', () => {
        const handleClose = jest.fn();
        render(<LegalModal open={true} onClose={handleClose} defaultTab="terms" />);

        expect(screen.getAllByText(/Terms of Service/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/1\. Acceptance of Terms/i)).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /Terms of Service/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /Privacy Policy/i })).toBeInTheDocument();
    });

    test('switches to Privacy Policy tab when clicked', () => {
        const handleClose = jest.fn();
        render(<LegalModal open={true} onClose={handleClose} defaultTab="terms" />);

        const privacyTab = screen.getByRole('tab', { name: /Privacy Policy/i });
        fireEvent.click(privacyTab);

        expect(screen.getAllByText(/Privacy Policy/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/1\. Information We Collect/i)).toBeInTheDocument();
    });

    test('calls onClose when close button is clicked', () => {
        const handleClose = jest.fn();
        render(<LegalModal open={true} onClose={handleClose} defaultTab="terms" />);

        const closeBtn = screen.getByRole('button', { name: /^Close$/i });
        fireEvent.click(closeBtn);
        expect(handleClose).toHaveBeenCalledTimes(1);
    });

    test('legal documents have required sections', () => {
        expect(TERMS_OF_SERVICE.sections.length).toBeGreaterThanOrEqual(8);
        expect(PRIVACY_POLICY.sections.length).toBeGreaterThanOrEqual(6);
    });

    test('includes governing law and named third-party providers', () => {
        const termsText = TERMS_OF_SERVICE.sections.map((s) => s.heading + ' ' + s.content).join(' ');
        expect(termsText).toMatch(/Governing Law/i);
        expect(termsText).toMatch(/State of Israel/);
        const privacyText = PRIVACY_POLICY.sections.map((s) => s.heading + ' ' + s.content).join(' ');
        expect(privacyText).toMatch(/Render/);
        expect(privacyText).toMatch(/MongoDB Atlas/);
        expect(privacyText).toMatch(/Web Push/);
    });

    test('Hebrew translations mirror the English documents', () => {
        expect(TERMS_OF_SERVICE_HE.sections.length).toBe(TERMS_OF_SERVICE.sections.length);
        expect(PRIVACY_POLICY_HE.sections.length).toBe(PRIVACY_POLICY.sections.length);
        expect(TERMS_OF_SERVICE_HE.dir).toBe('rtl');
        expect(PRIVACY_POLICY_HE.dir).toBe('rtl');
        expect(TERMS_OF_SERVICE_HE.sections[0].heading).toMatch(/^1\./);
    });

    test('accessibility statement exists in both languages', () => {
        expect(ACCESSIBILITY_STATEMENT.sections.length).toBeGreaterThanOrEqual(3);
        expect(ACCESSIBILITY_STATEMENT_HE.sections.length).toBe(ACCESSIBILITY_STATEMENT.sections.length);
        expect(LEGAL_DOCS.accessibility.en).toBe(ACCESSIBILITY_STATEMENT);
        expect(LEGAL_DOCS.accessibility.he).toBe(ACCESSIBILITY_STATEMENT_HE);
    });

    test('renders Accessibility tab', () => {
        const handleClose = jest.fn();
        render(<LegalModal open={true} onClose={handleClose} defaultTab="accessibility" />);
        expect(screen.getByRole('tab', { name: /Accessibility/i })).toBeInTheDocument();
        expect(screen.getByText(/1\. Our Commitment/i)).toBeInTheDocument();
    });
});
