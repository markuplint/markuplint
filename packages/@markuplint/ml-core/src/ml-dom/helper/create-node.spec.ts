import { parser } from '@markuplint/html-parser';
import { ARIA_RECOMMENDED_VERSION } from '@markuplint/ml-spec';
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
		const document = new Document(ast, ruleset, dummySchemas(), { ariaVersion: ARIA_RECOMMENDED_VERSION });
		const node = createNode(astNode!, document);
		expect(node.raw).toBe('<div>');
	});

	test('Invalid node (orphaned end tag) has isBogus', () => {
		const sourceCode = '<div></p></div>';
		const ast = parser.parse(sourceCode);
		const ruleset = convertRuleset({});
		const document = new Document(ast, ruleset, dummySchemas(), { ariaVersion: ARIA_RECOMMENDED_VERSION });
		const invalidNode = document.nodeList.find(n => n.raw === '</p>');
		expect(invalidNode).toBeDefined();
		expect((invalidNode as any).isBogus).toBe(true);
	});

	test('Normal text node has isBogus false', () => {
		const sourceCode = '<div>hello</div>';
		const ast = parser.parse(sourceCode);
		const ruleset = convertRuleset({});
		const document = new Document(ast, ruleset, dummySchemas(), { ariaVersion: ARIA_RECOMMENDED_VERSION });
		const textNode = document.nodeList.find(n => n.raw === 'hello');
		expect(textNode).toBeDefined();
		expect((textNode as any).isBogus).toBe(false);
	});
});
