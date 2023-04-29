const { isDocumentFragment, createTree } = require('@markuplint/html-parser');

const { flattenNodes } = require('../lib/flatten-nodes');

function toTree(rawCode) {
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
