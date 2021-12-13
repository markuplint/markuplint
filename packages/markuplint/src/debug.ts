import { enableDebug } from '@markuplint/ml-core';
import debug from 'debug';

export const log = debug('markuplint-cli');

export function verbosely() {
	if (!log.enabled) {
		debug.enable(`${log.namespace}*`);
		log(`Debug enable: ${log.namespace}`);
	}
	enableDebug();
}
