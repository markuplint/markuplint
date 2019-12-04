import { Document } from '../';
import { convertRuleset } from '../../';
import { createNode } from './create-node';
import { parse } from '@markuplint/html-parser';

describe('create Node', () => {
	it('Element', async () => {
		const sourceCode = '<div>text</div>';
		const ast = parse(sourceCode);
		const astNode = ast.nodeList[0];
		const ruleset = convertRuleset({});
		const document = new Document(ast, ruleset);
		const node = createNode(astNode, document);
		expect(node.raw).toBe('<div>');
	});
});
