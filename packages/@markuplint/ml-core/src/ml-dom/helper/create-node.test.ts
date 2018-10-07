import { parse } from '@markuplint/html-parser';
import MLDOMDocument from '../document';
import { createNode } from './create-node';

describe('create Node', () => {
	it('Element', async () => {
		const sourceCode = `<div>text</div>`;
		const ast = parse(sourceCode);
		const astNode = ast[0];
		// @ts-ignore
		const documentDummyForTest: MLDOMDocument = {};
		const node = createNode(astNode, documentDummyForTest);
		expect(node.type).toBe('Element');
	});
});
