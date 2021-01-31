import { createTree } from './create-tree';
import { flattenNodes } from './flatten-nodes';
import { isDocumentFragment } from '../lib';

function toTree(rawCode: string) {
	const isFragment = isDocumentFragment(rawCode);
	return createTree(rawCode, isFragment, 0, 0, 0);
}

describe('flattenNodes', () => {
	it('a node', () => {
		const raw = '<div></div>';
		const tree = toTree(raw);
		const list = flattenNodes(tree, raw);
		expect(list.length).toStrictEqual(2);
	});

	it('one depth', () => {
		const raw = '<div><span></span></div>';
		const tree = toTree(raw);
		const list = flattenNodes(tree, raw);
		expect(list.length).toStrictEqual(4);
	});

	it('two depth', () => {
		const raw = '<div><span><span></span></span></div>';
		const tree = toTree(raw);
		const list = flattenNodes(tree, raw);
		expect(list.length).toStrictEqual(6);
	});
});
