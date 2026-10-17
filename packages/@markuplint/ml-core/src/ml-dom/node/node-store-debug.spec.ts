import type { MLNode } from './node.js';
import type { MLASTNode } from '@markuplint/ml-ast';

import debug from 'debug';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { NodeStore } from './node-store.js';

/**
 * An AST node whose `raw` getter counts reads, so a test can tell whether
 * `setNode()` built its debug-log arguments.
 */
function createCountingAstNode() {
	const reads = { raw: 0 };
	const astNode = {
		uuid: 'uuid-1',
		nodeName: 'div',
		get raw() {
			reads.raw += 1;
			return '<div>\n\t</div>';
		},
	} as unknown as MLASTNode;
	return { astNode, reads };
}

const node = {} as MLNode<any, any, any>;

describe('NodeStore#setNode debug logging', () => {
	afterEach(() => {
		debug.disable();
		vi.restoreAllMocks();
	});

	test('does not build the log arguments while the logger is disabled', () => {
		debug.disable();
		const { astNode, reads } = createCountingAstNode();

		new NodeStore().setNode(astNode, node);

		expect(reads.raw).toBe(0);
	});

	test('still emits the message once the logger is enabled after import', () => {
		const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
		debug.enable('ml-core:node-store');
		const { astNode, reads } = createCountingAstNode();

		new NodeStore().setNode(astNode, node);

		expect(reads.raw).toBe(1);
		expect(write.mock.calls.map(([chunk]) => String(chunk)).join('')).toContain(
			'Mapped: uuid-1 (div: "<div>⏎→</div>")',
		);
	});
});
