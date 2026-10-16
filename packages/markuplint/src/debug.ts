import { enableDebug } from '@markuplint/ml-core';
import debug from 'debug';

/**
 * Read `.enabled` at call time; never cache it at module load. `debug.enable()` (including via `verbosely()` /
 * `enableDebug()`) can switch a namespace on after import.
 */
export const log = debug('markuplint-cli');

export function verbosely() {
	if (!log.enabled) {
		const namespace = `${log.namespace}*,ml-*`;
		debug.enable(namespace);
		log(`[Debug] Enable: "${namespace}"`);
	}
	enableDebug();
}
