import type { PretenderScannerScanMethod } from './types.js';
import type { PretenderScanOptions } from '@markuplint/ml-config';

import path from 'node:path';

export function createScanner<O extends PretenderScanOptions = PretenderScanOptions>(
	method: PretenderScannerScanMethod<O>,
) {
	return (files: readonly string[], options?: O) => {
		for (const file of files) {
			if (!path.isAbsolute(file)) {
				throw new ReferenceError(`A path is not an absolute path: ${file}`);
			}
		}

		return method(files, options);
	};
}
