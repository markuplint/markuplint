import type { PretenderScannerScanMethod } from './types.js';
import type { PretenderScanOptions } from '@markuplint/ml-config';

import path from 'node:path';

/**
 * Creates a pretender scanner by wrapping a scan method with path validation.
 * Ensures all provided file paths are absolute before delegating to the scan method.
 *
 * @template O - The scan options type, extending PretenderScanOptions
 * @param method - The underlying scan method to wrap with validation
 * @returns A wrapped scanner function that validates file paths and then invokes the scan method
 */
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
