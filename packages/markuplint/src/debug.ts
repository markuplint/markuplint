import { enableDebug } from '@markuplint/ml-core';
import debug from 'debug';

/**
 * Debug logger instance for the markuplint CLI, using the `markuplint-cli` namespace.
 */
export const log = debug('markuplint-cli');

/**
 * Enables verbose debug logging for both the CLI and the core library.
 *
 * When called, it activates the `markuplint-cli*` and `ml-*` debug namespaces
 * and turns on the core library's internal debug output.
 */
export function verbosely() {
	if (!log.enabled) {
		const namespace = `${log.namespace}*,ml-*`;
		debug.enable(namespace);
		log(`[Debug] Enable: "${namespace}"`);
	}
	enableDebug();
}
