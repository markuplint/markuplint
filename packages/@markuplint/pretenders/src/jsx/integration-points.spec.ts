import type { Pretender } from '@markuplint/ml-config';

import path from 'node:path';

import { beforeAll, describe, expect, test } from 'vitest';

import { jsxScanner } from './index.js';

const fixture = path.resolve(import.meta.dirname, '..', '..', 'test', 'fixtures', '013-integration-points.tsx');

/**
 * A slot wrapper in an integration point of SVG or MathML is in the namespace that the tree construction gives what is
 * in the integration point.
 */
describe('the namespace of a slot wrapper in an integration point', () => {
	let asOf: (selector: string) => Pretender['as'] | undefined;

	beforeAll(async () => {
		const pretenders = await jsxScanner([fixture]);
		asOf = (selector: string) => pretenders.find(p => p.selector === selector)?.as;
	});

	test('in an annotation-xml whose encoding is HTML, it is HTML', () => {
		expect(asOf('AnnotationHtmlSlot')).toStrictEqual({
			element: 'math',
			slots: [{ element: 'div', namespace: 'html' }],
		});
	});

	test('in an annotation-xml whose encoding is a string in an expression, it is HTML', () => {
		expect(asOf('AnnotationExpressionSlot')).toStrictEqual({
			element: 'math',
			slots: [{ element: 'div', namespace: 'html' }],
		});
	});

	test('in an annotation-xml of another encoding, it is MathML', () => {
		expect(asOf('AnnotationTexSlot')).toStrictEqual({
			element: 'math',
			slots: [{ element: 'mrow', namespace: 'math' }],
		});
	});

	test('in a MathML text integration point, it is HTML', () => {
		expect(asOf('TextIntegrationSlot')).toStrictEqual({
			element: 'math',
			slots: [{ element: 'span', namespace: 'html' }],
		});
	});

	test('in the desc of SVG, it is HTML', () => {
		expect(asOf('DescSlot')).toStrictEqual({
			element: 'svg',
			slots: [{ element: 'span', namespace: 'html' }],
		});
	});
});
