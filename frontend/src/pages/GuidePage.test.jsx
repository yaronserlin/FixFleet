// src/pages/GuidePage.test.jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GuidePage from './GuidePage';
import { parseGuide, GUIDE_SOURCE } from '../utils/guideContent';
import { useAuth } from '../contexts/AuthContext';

jest.mock('../contexts/AuthContext');

const GUIDE_HTML = `<!doctype html><html><body>
<header class="cover"><p class="lede">Guide lede text.</p></header>
<main>
  <section id="start"><h2 class="sec">Getting started</h2><img src="images/login.webp" alt="Sign-in screen"><script>window.evil = 1</script></section>
  <section id="faults"><h2 class="sec">Reporting faults</h2><p>Fault help.</p></section>
</main></body></html>`;

describe('parseGuide', () => {
    it('extracts sections, makes image paths absolute and drops scripts', () => {
        const guide = parseGuide(GUIDE_HTML);
        expect(guide.toc).toEqual([
            { id: 'start', label: 'Getting started' },
            { id: 'faults', label: 'Reporting faults' },
        ]);
        expect(guide.lede).toBe('Guide lede text.');
        expect(guide.html).toContain('src="/user-guide/images/login.webp"');
        expect(guide.html).not.toContain('<script');
    });

    it('rejects a page without guide content', () => {
        expect(() => parseGuide('<html><body><p>nope</p></body></html>')).toThrow();
    });
});

describe('GuidePage', () => {
    afterEach(() => { delete global.fetch; });

    function renderGuide(fetchImpl) {
        global.fetch = jest.fn(fetchImpl);
        useAuth.mockReturnValue({ user: null, loading: false });
        render(<MemoryRouter initialEntries={['/guide']}><GuidePage /></MemoryRouter>);
    }

    it('loads the guide content and builds the contents list', async () => {
        renderGuide(() => Promise.resolve({ ok: true, text: () => Promise.resolve(GUIDE_HTML) }));
        expect(await screen.findByRole('heading', { name: 'Reporting faults' })).toBeInTheDocument();
        expect(global.fetch).toHaveBeenCalledWith(GUIDE_SOURCE);
        expect(screen.getByAltText('Sign-in screen')).toHaveAttribute('src', '/user-guide/images/login.webp');
        expect(screen.getAllByRole('link', { name: 'Getting started' })[0]).toHaveAttribute('href', '/guide#start');
    });

    it('shows an error when the guide cannot be fetched', async () => {
        renderGuide(() => Promise.resolve({ ok: false, status: 404 }));
        expect(await screen.findByRole('alert')).toHaveTextContent(/could not be loaded/i);
    });
});
