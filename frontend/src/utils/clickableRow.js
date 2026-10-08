// src/utils/clickableRow.js

/**
 * Props that make a MUI <TableRow> act as a button: pointer cursor, hover,
 * keyboard activation (Enter/Space), and an accessible name.
 *
 * Cells holding their own controls (switches, selects, icon buttons) should
 * spread `stopRowClick` so using the control doesn't also activate the row.
 * React bubbles events through portals, so this covers Select/Menu popups too.
 */
export const clickableRowProps = (onActivate, label) => ({
    hover: true,
    tabIndex: 0,
    role: 'button',
    'aria-label': label,
    onClick: onActivate,
    onKeyDown: (e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onActivate();
        }
    },
    sx: { cursor: 'pointer' },
});

export const stopRowClick = {
    onClick: (e) => e.stopPropagation(),
    onKeyDown: (e) => e.stopPropagation(),
};
