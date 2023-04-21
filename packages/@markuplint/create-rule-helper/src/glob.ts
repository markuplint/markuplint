import { sep } from 'node:path';

import { glob as origin } from 'glob';

const glob = async (pattern: string) => {
	const normalized = pattern.split(sep).join('/');
	return await origin(normalized);
};

export default glob;
