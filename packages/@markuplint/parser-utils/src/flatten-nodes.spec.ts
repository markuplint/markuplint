import { isDocumentFragment, createTree } from '@markuplint/html-parser';
import { describe, test, expect } from 'vitest';

import { flattenNodes } from './flatten-nodes.js';

function toTree(rawCode: string) {
	const isFragment = isDocumentFragment(rawCode);
	return createTree(rawCode, isFragment, 0, 0, 0);
}

describe('flattenNodes', () => {
	test('a node', () => {
		const raw = '<div></div>';
		const tree = toTree(raw);
		const list = flattenNodes(tree, raw);
		expect(list.length).toStrictEqual(2);
	});

	test('one depth', () => {
		const raw = '<div><span></span></div>';
		const tree = toTree(raw);
		const list = flattenNodes(tree, raw);
		expect(list.length).toStrictEqual(4);
	});

	test('two depth', () => {
		const raw = '<div><span><span></span></span></div>';
		const tree = toTree(raw);
		const list = flattenNodes(tree, raw);
		expect(list.length).toStrictEqual(6);
	});
});
