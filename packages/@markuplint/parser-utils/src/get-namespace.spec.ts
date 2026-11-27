import { describe, test, expect } from 'vitest';

import type { MLASTElement } from '@markuplint/ml-ast';

import { getChildNamespace, getNamespace, getNamespaceBelow } from './get-namespace.js';

const HTML = 'http://www.w3.org/1999/xhtml';
const SVG = 'http://www.w3.org/2000/svg';
const MATHML = 'http://www.w3.org/1998/Math/MathML';

describe('getChildNamespace', () => {
	test('svg and math enter their namespaces from HTML', () => {
		expect(getChildNamespace('svg', HTML, 'div')).toBe(SVG);
		expect(getChildNamespace('math', HTML, null)).toBe(MATHML);
	});

	test('the names are compared in lowercase', () => {
		expect(getChildNamespace('Svg', HTML, 'div')).toBe(SVG);
		expect(getChildNamespace('MATH', HTML, 'div')).toBe(MATHML);
	});

	test('the children of foreignObject are HTML', () => {
		expect(getChildNamespace('div', SVG, 'foreignObject')).toBe(HTML);
		expect(getChildNamespace(null, SVG, 'foreignObject')).toBe(HTML);
	});

	test('the children of desc and title of SVG are HTML', () => {
		expect(getChildNamespace('div', SVG, 'desc')).toBe(HTML);
		expect(getChildNamespace('span', SVG, 'title')).toBe(HTML);
		expect(getChildNamespace('svg', SVG, 'title')).toBe(SVG);
		expect(getChildNamespace('math', SVG, 'desc')).toBe(MATHML);
	});

	test('the children of a MathML text integration point are HTML, except mglyph and malignmark', () => {
		for (const parent of ['mi', 'mo', 'mn', 'ms', 'mtext']) {
			expect(getChildNamespace('span', MATHML, parent)).toBe(HTML);
		}
		expect(getChildNamespace('mglyph', MATHML, 'mi')).toBe(MATHML);
		expect(getChildNamespace('malignmark', MATHML, 'mtext')).toBe(MATHML);
		expect(getChildNamespace('svg', MATHML, 'mi')).toBe(SVG);
		expect(getChildNamespace(null, MATHML, 'mo')).toBe(HTML);
	});

	test('the children of annotation-xml are HTML when its encoding is HTML, and svg is SVG', () => {
		expect(getChildNamespace('div', MATHML, 'annotation-xml', 'text/html')).toBe(HTML);
		expect(getChildNamespace('div', MATHML, 'annotation-xml', 'Application/XHTML+XML')).toBe(HTML);
		expect(getChildNamespace('div', MATHML, 'annotation-xml', 'application/x-tex')).toBe(MATHML);
		expect(getChildNamespace('div', MATHML, 'annotation-xml')).toBe(MATHML);
		expect(getChildNamespace('svg', MATHML, 'annotation-xml')).toBe(SVG);
	});

	test('the name of an integration point is compared ASCII case-insensitively', () => {
		expect(getChildNamespace('div', SVG, 'foreignobject')).toBe(HTML);
		expect(getChildNamespace('div', SVG, 'DESC')).toBe(HTML);
		expect(getChildNamespace('div', SVG, 'Title')).toBe(HTML);
		expect(getChildNamespace('div', MATHML, 'MTEXT')).toBe(HTML);
		expect(getChildNamespace('MGLYPH', MATHML, 'mi')).toBe(MATHML);
		expect(getChildNamespace('div', MATHML, 'Annotation-XML', 'TEXT/HTML')).toBe(HTML);
	});

	test('a name of an integration point in another namespace is not one', () => {
		expect(getChildNamespace('div', HTML, 'title')).toBe(HTML);
		expect(getChildNamespace('path', SVG, 'mi')).toBe(SVG);
		expect(getChildNamespace('mrow', MATHML, 'desc')).toBe(MATHML);
		expect(getChildNamespace('div', MATHML, 'annotation')).toBe(MATHML);
	});

	test('the others take the namespace of the parent', () => {
		expect(getChildNamespace('path', SVG, 'g')).toBe(SVG);
		expect(getChildNamespace('math', SVG, 'g')).toBe(SVG);
		expect(getChildNamespace('mi', MATHML, 'math')).toBe(MATHML);
		expect(getChildNamespace('div', HTML, 'body')).toBe(HTML);
		expect(getChildNamespace(null, HTML, null)).toBe(HTML);
	});
});

describe('getNamespaceBelow', () => {
	test('the namespace depends on the ancestor without a transition', () => {
		expect(getNamespaceBelow('g', ['g'])).toBeNull();
		expect(getNamespaceBelow('div', ['p', 'span'])).toBeNull();
		expect(getNamespaceBelow(null, [])).toBeNull();
	});

	test('an svg or math ancestor decides the namespace', () => {
		expect(getNamespaceBelow('svg', ['g'])).toBe(SVG);
		expect(getNamespaceBelow('svg', ['math'])).toBe(SVG);
		expect(getNamespaceBelow('math', ['mrow'])).toBe(MATHML);
	});

	test('below foreignObject is HTML wherever the ancestor is', () => {
		expect(getNamespaceBelow('svg', ['foreignObject', 'div'])).toBe(HTML);
		expect(getNamespaceBelow('g', ['foreignObject', 'div'])).toBe(HTML);
		expect(getNamespaceBelow('foreignObject', ['div'])).toBe(HTML);
	});

	test('svg and math enter their namespaces', () => {
		expect(getNamespaceBelow('div', ['svg'])).toBe(SVG);
		expect(getNamespaceBelow('div', ['svg', 'g'])).toBe(SVG);
		expect(getNamespaceBelow('div', ['math', 'mi'])).toBe(MATHML);
	});

	test('the transitions after the first follow from it', () => {
		expect(getNamespaceBelow('div', ['svg', 'foreignObject', 'p'])).toBe(HTML);
		expect(getNamespaceBelow('div', ['svg', 'math'])).toBe(SVG);
	});

	test('a component does not enter a namespace by its name', () => {
		expect(getNamespaceBelow('div', [null, 'g'])).toBeNull();
	});
});

describe('getNamespace', () => {
	const annotationXml = (attrName: string, value: string, startQuote = '"') =>
		({
			nodeName: 'annotation-xml',
			namespace: MATHML,
			attributes: [
				{ type: 'attr', name: { raw: attrName }, value: { raw: value }, startQuote: { raw: startQuote } },
			],
		}) as unknown as MLASTElement;

	test('reads the `encoding` of an `annotation-xml` of the AST', () => {
		expect(getNamespace('div', annotationXml('encoding', 'text/html'))).toBe(HTML);
		expect(getNamespace('div', annotationXml('ENCODING', 'TEXT/HTML'))).toBe(HTML);
		expect(getNamespace('div', annotationXml('encoding', 'application/x-tex'))).toBe(MATHML);
		expect(getNamespace('div', annotationXml('encoding', 'text&#47;html'))).toBe(HTML);
	});

	test('reads a string in an expression container, and no other code', () => {
		expect(getNamespace('div', annotationXml('encoding', '"text/html"', '{'))).toBe(HTML);
		expect(getNamespace('div', annotationXml('encoding', 'html', '{'))).toBe(MATHML);
	});

	test('a component named like an integration point is not one', () => {
		const component = {
			nodeName: 'Title',
			namespace: SVG,
			elementType: 'authored',
			attributes: [],
		} as unknown as MLASTElement;
		expect(getNamespace('path', component)).toBe(SVG);
		const title = {
			nodeName: 'title',
			namespace: SVG,
			elementType: 'html',
			attributes: [],
		} as unknown as MLASTElement;
		expect(getNamespace('div', title)).toBe(HTML);
	});
});

describe('getNamespaceBelow, through integration points', () => {
	test('below a MathML text integration point is HTML wherever it is, except mglyph and malignmark', () => {
		expect(getNamespaceBelow('mi', ['div'])).toBe(HTML);
		expect(getNamespaceBelow(null, ['mtext', 'span'])).toBe(HTML);
		expect(getNamespaceBelow('mi', ['mglyph'])).toBeNull();
		expect(getNamespaceBelow('math', ['mi', 'mglyph'])).toBe(MATHML);
	});

	test('below desc and title is HTML wherever they are', () => {
		expect(getNamespaceBelow('desc', ['div'])).toBe(HTML);
		expect(getNamespaceBelow(null, ['title', 'span'])).toBe(HTML);
	});

	test('an annotation-xml decides by its encoding, and an HTML encoding makes HTML in an unknown namespace too', () => {
		expect(getNamespaceBelow('math', [{ name: 'annotation-xml', encoding: 'text/html' }, 'div'])).toBe(HTML);
		expect(getNamespaceBelow('math', [{ name: 'annotation-xml', encoding: null }, 'div'])).toBe(MATHML);
		expect(getNamespaceBelow({ name: 'annotation-xml', encoding: 'text/html' }, ['div'])).toBe(HTML);
		expect(getNamespaceBelow({ name: 'annotation-xml', encoding: 'application/x-tex' }, ['div'])).toBeNull();
		expect(getNamespaceBelow('math', [{ name: 'annotation-xml', encoding: null }, 'svg'])).toBe(SVG);
	});
});
