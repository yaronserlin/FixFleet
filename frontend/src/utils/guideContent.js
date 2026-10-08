// src/utils/guideContent.js

// The guide's content lives in one static file (public/user-guide/index.html,
// produced by the user-guide tooling) so it can be regenerated without code
// changes. It is fetched at runtime rather than bundled, keeping ~57 KB of
// prose out of the app's JavaScript.
export const GUIDE_SOURCE = '/user-guide/index.html';
const GUIDE_ASSET_BASE = '/user-guide/';

/**
 * Pull the renderable parts out of the static guide page: the <main>
 * content (with screenshot paths made absolute), a table of contents built
 * from its sections, and the cover's lede.
 */
export function parseGuide(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const main = doc.querySelector('main');
    if (!main) throw new Error('Guide content not found');
    main.querySelectorAll('script, iframe, object, embed').forEach(n => n.remove());
    main.querySelectorAll('img[src]').forEach(img => {
        const src = img.getAttribute('src');
        if (!/^(\/|[a-z]+:)/i.test(src)) img.setAttribute('src', GUIDE_ASSET_BASE + src);
    });
    const toc = [...main.querySelectorAll('section[id]')].map(s => ({
        id: s.id,
        label: s.querySelector('h2')?.textContent.trim() || s.id,
    }));
    return { html: main.innerHTML, toc, lede: doc.querySelector('.lede')?.textContent.trim() || '' };
}
