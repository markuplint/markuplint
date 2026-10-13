import { describe, test, expect } from 'vitest';

import { getChildNamespace, getNamespaceBelow } from './get-namespace.js';

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
