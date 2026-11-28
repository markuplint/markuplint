import type { Pretender } from '@markuplint/ml-config';

import path from 'node:path';

import { beforeAll, describe, expect, test } from 'vitest';

import { jsxScanner } from './index.js';

const fixture = path.resolve(import.meta.dirname, '..', '..', 'test', 'fixtures', '013-integration-points.tsx');

/**
 * React makes an element in the namespace of its parent, and an element in `foreignObject` in the HTML namespace: the
 * other integration points of the HTML parser (`desc`, `mi`, `annotation-xml`) are not followed.
 */
describe('the namespace of a slot wrapper in what the HTML parser takes for an integration point', () => {
	let asOf: (selector: string) => Pretender['as'] | undefined;

	beforeAll(async () => {
		const pretenders = await jsxScanner([fixture]);
		asOf = (selector: string) => pretenders.find(p => p.selector === selector)?.as;
	});

	test('in an annotation-xml whose encoding is HTML, it is MathML', () => {
		expect(asOf('AnnotationHtmlSlot')).toStrictEqual({
			element: 'math',
			slots: [{ element: 'div', namespace: 'math' }],
		});
		expect(asOf('AnnotationExpressionSlot')).toStrictEqual({
			element: 'math',
			slots: [{ element: 'div', namespace: 'math' }],
		});
	});

	test('in an annotation-xml of another encoding, it is MathML', () => {
		expect(asOf('AnnotationTexSlot')).toStrictEqual({
			element: 'math',
			slots: [{ element: 'mrow', namespace: 'math' }],
		});
	});

	test('in a MathML text integration point, it is MathML', () => {
		expect(asOf('TextIntegrationSlot')).toStrictEqual({
			element: 'math',
			slots: [{ element: 'span', namespace: 'math' }],
		});
	});

	test('in the desc of SVG, it is SVG', () => {
		expect(asOf('DescSlot')).toStrictEqual({
			element: 'svg',
			slots: [{ element: 'span', namespace: 'svg' }],
		});
	});
});
