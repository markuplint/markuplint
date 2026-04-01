import { describe, test, expect } from 'vitest';

import { getName } from './utils.ts';

describe('getName', () => {
	test('HTML element', () => {
		expect(getName('div')).toStrictEqual({
			localName: 'div',
			namespace: undefined,
			ml: 'HTML',
		});
	});

	test('SVG element', () => {
		expect(getName('svg_circle')).toStrictEqual({
			localName: 'circle',
			namespace: 'http://www.w3.org/2000/svg',
			ml: 'SVG',
		});
	});

	test('MathML element', () => {
		expect(getName('mml_math')).toStrictEqual({
			localName: 'math',
			namespace: 'http://www.w3.org/1998/Math/MathML',
			ml: 'MathML',
		});
	});

	test('MathML element with hyphen', () => {
		expect(getName('mml_annotation-xml')).toStrictEqual({
			localName: 'annotation-xml',
			namespace: 'http://www.w3.org/1998/Math/MathML',
			ml: 'MathML',
		});
	});

	test('case insensitivity of prefix', () => {
		expect(getName('SVG_circle')).toStrictEqual({
			localName: 'circle',
			namespace: 'http://www.w3.org/2000/svg',
			ml: 'SVG',
		});
		expect(getName('MML_math')).toStrictEqual({
			localName: 'math',
			namespace: 'http://www.w3.org/1998/Math/MathML',
			ml: 'MathML',
		});
	});

	test('plain name without prefix', () => {
		expect(getName('custom-element')).toStrictEqual({
			localName: 'custom-element',
			namespace: undefined,
			ml: 'HTML',
		});
	});
});
