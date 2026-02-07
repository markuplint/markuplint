/**
 * @module @markuplint/pretenders
 *
 * Provides scanning utilities for detecting component-to-element mappings (pretenders)
 * in JSX/TSX source files. Pretenders allow markuplint to understand which native HTML
 * elements a component renders, enabling accurate linting of component-based code.
 */

export { jsxScanner } from './jsx/index.js';
export type * from './types.js';
