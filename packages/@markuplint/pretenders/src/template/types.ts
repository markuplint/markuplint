import type { PretenderScanEntry } from '../types.js';
import type { PretenderScanOptions } from '@markuplint/ml-config';

export interface PretenderScanTemplateOptions extends PretenderScanOptions {
	/**
	 * The file being linted, whose names for the components it imports are added as pretenders.
	 * Only `autoScan` has one.
	 */
	readonly entry?: PretenderScanEntry;
}
