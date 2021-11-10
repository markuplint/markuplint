import { enableDebug } from '@markuplint/ml-core';
import debug from 'debug';

export const log = debug('markuplint-cli');

export function verbosely() {
	if (!debug.enabled('markuplint-cli')) {
		debug.enable('markuplint-cli*');
	}
	enableDebug();
}
