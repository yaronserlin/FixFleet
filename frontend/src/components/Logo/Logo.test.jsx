import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Logo, { LogoMark } from './Logo';

describe('Logo Component', () => {
    it('renders LogoMark SVG without errors', () => {
        const { container } = render(<LogoMark size={40} />);
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
        expect(svg).toHaveAttribute('viewBox', '0 0 64 64');
    });

    it('renders full Logo with brand text and subtitle', () => {
        render(
            <MemoryRouter>
                <Logo subtitle="Ops Manager" />
            </MemoryRouter>
        );
        expect(screen.getByText('MAINTENANCE')).toBeInTheDocument();
        expect(screen.getByText('Ops Manager')).toBeInTheDocument();
    });

    it('renders mark-only variant when specified', () => {
        render(
            <MemoryRouter>
                <Logo variant="mark" />
            </MemoryRouter>
        );
        expect(screen.queryByText('MAINTENANCE')).not.toBeInTheDocument();
    });

    it('generates unique gradient/filter IDs per LogoMark instance so multiple simultaneous instances (e.g. mobile + desktop nav) all resolve their url(#id) fills', () => {
        const { container } = render(
            <>
                <LogoMark size={40} />
                <LogoMark size={24} />
            </>
        );
        const svgs = container.querySelectorAll('svg');
        expect(svgs).toHaveLength(2);

        const idsPerSvg = Array.from(svgs).map((svg) =>
            Array.from(svg.querySelectorAll('[id]')).map((el) => el.id)
        );

        // Each SVG should define the same 4 def elements (bg/gear/wrench gradients + shadow filter).
        idsPerSvg.forEach((ids) => expect(ids).toHaveLength(4));

        // No ID should be duplicated across the two instances.
        const allIds = idsPerSvg.flat();
        const uniqueIds = new Set(allIds);
        expect(uniqueIds.size).toBe(allIds.length);

        // Every fill/filter url(#...) reference inside each SVG must resolve to an id defined in that same SVG.
        idsPerSvg.forEach((ids, index) => {
            const svg = svgs[index];
            const idSet = new Set(ids);
            const allElements = svg.querySelectorAll('*');
            let refCount = 0;
            allElements.forEach((el) => {
                ['fill', 'filter', 'stroke'].forEach((attr) => {
                    const value = el.getAttribute(attr);
                    if (value && value.startsWith('url(#')) {
                        refCount += 1;
                        const referencedId = value.slice(5, -1);
                        expect(idSet.has(referencedId)).toBe(true);
                    }
                });
            });
            expect(refCount).toBeGreaterThan(0);
        });
    });
});
