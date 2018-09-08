import { parse } from '@markuplint/html-parser';
import { createNode } from './create-node';

describe('create Node', () => {
	it('Element', async () => {
		const sourceCode = `<div>text</div>`;
		const ast = parse(sourceCode);
		const astNode = ast[0];
		const node = createNode(astNode, null);
		expect(node.type).toBe('Element');
	});
});
