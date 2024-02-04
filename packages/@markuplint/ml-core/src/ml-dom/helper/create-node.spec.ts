import { parser } from '@markuplint/html-parser';
import { describe, test, expect } from 'vitest';

import { Document, convertRuleset } from '../../index.js';
import { dummySchemas } from '../../test/index.js';

import { createNode } from './create-node.js';

describe('create Node', () => {
	test('Element', () => {
		const sourceCode = '<div>text</div>';
		const ast = parser.parse(sourceCode);
		const astNode = ast.nodeList[0];
		const ruleset = convertRuleset({});
		const document = new Document(ast, ruleset, dummySchemas());
		const node = createNode(astNode!, document);
		expect(node.raw).toBe('<div>');
	});
});
