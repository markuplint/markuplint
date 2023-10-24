import { sep } from 'node:path';

import { glob as origin } from 'glob';

export const glob = async (pattern: string) => {
	const normalized = pattern.split(sep).join('/');
	return await origin(normalized);
};
