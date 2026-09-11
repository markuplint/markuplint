import { enableDebug } from '@markuplint/ml-core';
import debug from 'debug';

export const log = debug('markuplint-cli');

export function verbosely() {
	if (!log.enabled) {
		const namespace = `${log.namespace}*,ml-*`;
		debug.enable(namespace);
		log(`[Debug] Enable: "${namespace}"`);
	}
	enableDebug();
}
