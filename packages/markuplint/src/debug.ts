import debug from 'debug';
import { enableDebug } from '@markuplint/ml-core';

export const log = debug('markuplint-cli');

export function verbosely() {
	if (!debug.enabled('markuplint-cli')) {
		debug.enable('markuplint-cli*');
	}
	enableDebug();
}
