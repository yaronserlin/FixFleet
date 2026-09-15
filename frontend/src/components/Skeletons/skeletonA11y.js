// src/components/Skeletons/skeletonA11y.js

/**
 * Accessibility props for the element wrapping a loading skeleton.
 *
 * The spinners these skeletons replace carried a visible "Loading ..."
 * caption that screen readers announced; a wall of grey blocks announces
 * nothing on its own, so spread this onto the skeleton's container to keep
 * that announcement (and give tests a stable handle on the loading state):
 *
 *   <Container {...skeletonA11yProps('Loading equipment fleet')}>
 *
 * Kept out of Skeletons.jsx so that file only exports components, which is
 * what React Fast Refresh needs to hot-reload it cleanly.
 *
 * @param {string} label Human-readable description of what is loading.
 */
export function skeletonA11yProps(label = 'Loading') {
    return { role: 'status', 'aria-busy': true, 'aria-label': label };
}

export default skeletonA11yProps;
