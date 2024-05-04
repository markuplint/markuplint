import type { MLASTNode } from '@markuplint/ml-ast';

import debug from 'debug';

import { nodeListToDebugMaps } from './debugger.js';

export const log = debug('ml-parser');

export function domLog(nodeList: readonly (MLASTNode | null)[]) {
	log('Parse result: %O', nodeListToDebugMaps(nodeList, true));
}
