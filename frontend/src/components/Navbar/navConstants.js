// src/components/Navbar/navConstants.js
//
// Shared layout dimensions for the sidebar / rail / bottom-bar navigation,
// used by both the nav components themselves and AppLayout (src/routes.jsx)
// so the main content area's margins/padding always match what's actually
// rendered.

/** Full desktop sidebar width (icon + label), shown at >= "lg" (1200px). */
export const SIDEBAR_FULL_WIDTH = 240;

/** Collapsed "rail" sidebar width (icon only), shown "sm"-"lg" (600-1200px). */
export const SIDEBAR_RAIL_WIDTH = 72;

/** Bottom app bar height on phone widths (< "sm" / 600px), excluding safe-area inset. */
export const BOTTOM_NAV_HEIGHT = 64;
