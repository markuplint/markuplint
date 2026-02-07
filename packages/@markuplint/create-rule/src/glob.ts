import path from 'node:path';

import { glob as origin } from 'glob';

/**
 * Cross-platform glob wrapper that normalizes path separators before matching.
 *
 * Converts backslashes (Windows `path.sep`) to forward slashes so that
 * glob patterns work consistently across operating systems.
 *
 * @param pattern - The glob pattern to match against (may contain OS-specific separators).
 * @returns An array of file paths matching the pattern.
 */
export const glob = async (pattern: string) => {
	const normalized = pattern.split(path.sep).join('/');
	return await origin(normalized);
};
