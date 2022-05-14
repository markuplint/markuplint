import { parse } from '@markuplint/html-parser';

import { Document } from '../';
import { convertRuleset } from '../../';
import { dummySchemas } from '../../test';

import { createNode } from './create-node';

describe('create Node', () => {
	it('Element', () => {
		const sourceCode = '<div>text</div>';
		const ast = parse(sourceCode);
		const astNode = ast.nodeList[0];
		const ruleset = convertRuleset({});
		const document = new Document(ast, ruleset, dummySchemas());
		const node = createNode(astNode, document);
		expect(node.raw).toBe('<div>');
	});
});
