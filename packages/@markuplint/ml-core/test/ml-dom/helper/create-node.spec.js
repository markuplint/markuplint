const { parse } = require('@markuplint/html-parser');

const { convertRuleset } = require('../../../');
const { Document } = require('../../../lib/ml-dom/');
const { createNode } = require('../../../lib/ml-dom/helper/create-node');
const { dummySchemas } = require('../../../lib/test');

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
