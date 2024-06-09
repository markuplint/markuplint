import path from 'node:path';

import { glob as origin } from 'glob';

export const glob = async (pattern: string) => {
	const normalized = pattern.split(path.sep).join('/');
	return await origin(normalized);
};
