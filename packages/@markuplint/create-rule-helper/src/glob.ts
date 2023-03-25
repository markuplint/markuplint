import { sep } from 'node:path';
import util from 'node:util';

import syncGlob from 'glob';

const glob = async (
	pattern: string,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	options?: syncGlob.IOptions,
) => {
	const normalized = pattern.split(sep).join('/');
	return await util.promisify(syncGlob)(normalized, options);
};

export default glob;
