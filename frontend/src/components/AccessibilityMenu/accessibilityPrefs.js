// src/components/AccessibilityMenu/accessibilityPrefs.js
//
// Preference storage and placement helpers for AccessibilityMenu.

export const STORAGE_KEY = 'accessibility-preferences';
export const FONT_STEPS = [100, 110, 125, 150];
export const DEFAULTS = { fontStep: 0, highContrast: false, underlineLinks: false };

/** Gap in px between the button and whatever it sits above. */
export const EDGE_GAP = 16;

/** Bottom-pinned elements the button must never cover. */
const OBSTACLE_SELECTOR = 'footer, [data-a11y-obstacle]';

/**
 * How far from the bottom of the viewport the button should sit so it clears
 * every visible bottom obstacle.
 *
 * @param {{top: number, bottom: number}[]} rects Obstacle bounding boxes.
 * @param {number} viewportHeight window.innerHeight.
 * @returns {number} Bottom offset in px.
 */
export function computeBottomOffset(rects, viewportHeight) {
    const covered = rects.reduce((max, rect) => {
        const visible = rect.bottom > 0 && rect.top < viewportHeight;
        return visible ? Math.max(max, viewportHeight - rect.top) : max;
    }, 0);
    return Math.max(0, covered) + EDGE_GAP;
}

export function measureBottomOffset() {
    const rects = Array.from(document.querySelectorAll(OBSTACLE_SELECTOR))
        .map((el) => el.getBoundingClientRect())
        .filter((rect) => rect.height > 0);
    return computeBottomOffset(rects, window.innerHeight);
}

export function loadPrefs() {
    try {
        return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
    } catch {
        return { ...DEFAULTS };
    }
}

export function applyPrefs(prefs) {
    const root = document.documentElement;
    root.style.fontSize = `${FONT_STEPS[prefs.fontStep] ?? 100}%`;
    root.classList.toggle('a11y-high-contrast', prefs.highContrast);
    root.classList.toggle('a11y-underline-links', prefs.underlineLinks);
}
