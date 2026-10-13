import type { Pretender } from '@markuplint/ml-config';

import path from 'node:path';

import { beforeAll, describe, expect, test } from 'vitest';

import { jsxScanner } from './index.js';

const fixture = path.resolve(import.meta.dirname, '..', '..', 'test', 'fixtures', '011-issue-4147.tsx');

/**
 * The scanner reports the element that directly wraps the slot, and ml-core takes it to be
 * a child of the root. Where that would give the wrapper another namespace than the one it
 * has, the scanner states it.
 */
describe('the namespace of a slot wrapper', () => {
	let asOf: (selector: string) => Pretender['as'] | undefined;

	beforeAll(async () => {
		const pretenders = await jsxScanner([fixture]);
		asOf = (selector: string) => pretenders.find(p => p.selector === selector)?.as;
	});

	test('a wrapper inside foreignObject states the HTML namespace', () => {
		expect(asOf('ForeignObjectSlot')).toStrictEqual({
			element: 'svg',
			slots: [{ element: 'div', namespace: 'html' }],
		});
	});

	test('a wrapper inside foreignObject below a g root states the HTML namespace', () => {
		expect(asOf('GroupForeignObjectSlot')).toStrictEqual({
			element: 'g',
			slots: [{ element: 'div', namespace: 'html' }],
		});
	});

	test('a wrapper in an svg root states the SVG namespace', () => {
		expect(asOf('GroupSlot')).toStrictEqual({
			element: 'svg',
			slots: [{ element: 'g', namespace: 'svg' }],
		});
	});

	test('a wrapper that enters SVG states the SVG namespace', () => {
		expect(asOf('InnerSvgSlot')).toStrictEqual({
			element: 'div',
			slots: [{ element: 'svg', namespace: 'svg' }],
		});
	});

	test('a wrapper whose namespace depends on where the root is rendered states none', () => {
		expect(asOf('ParagraphSlot')).toStrictEqual({
			element: 'div',
			slots: [{ element: 'p' }],
		});
	});

	test('a component does not enter a namespace by its name', () => {
		expect(asOf('ComponentNamedSvgSlot')).toStrictEqual({
			element: 'div',
			slots: [{ element: 'g' }],
		});
	});
});
