import path from 'node:path';

import { glob as origin } from 'glob';

/**
 * Converts backslashes (Windows `path.sep`) to forward slashes so that
 * glob patterns work consistently across operating systems.
 */
export const glob = async (pattern: string) => {
	const normalized = pattern.split(path.sep).join('/');
	return await origin(normalized);
};
