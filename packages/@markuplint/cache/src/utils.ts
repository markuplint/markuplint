import { promisify } from 'node:util';

import glob from 'glob';
const aGlob = promisify(glob);

export function asyncGlob(pattern: string) {
	return aGlob(pattern);
}
