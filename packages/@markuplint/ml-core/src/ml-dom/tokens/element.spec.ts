import { parse } from '@markuplint/html-parser';
import { MLASTElement } from '@markuplint/ml-ast';
import Element from './element';

describe('new Element', () => {
	it('<div>', async () => {
		const sourceCode = `<div>text</div>`;
		const ast = parse(sourceCode);
		const astNode = ast.nodeList[0] as MLASTElement;
		// @ts-ignore
		const documentDummyForTest: MLDOMDocument = {};
		const element = new Element(astNode, documentDummyForTest);
		expect(element.type).toBe('Element');
		expect(element.nodeName).toBe('div');
	});
});
