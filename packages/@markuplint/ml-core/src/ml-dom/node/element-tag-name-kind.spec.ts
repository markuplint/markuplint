import type { Pretender } from '@markuplint/ml-config';
import type { MLMLSpec } from '@markuplint/ml-spec';

import { parser } from '@markuplint/html-parser';
import spec from '@markuplint/html-spec';
import { ARIA_RECOMMENDED_VERSION } from '@markuplint/ml-spec';
import { describe, test, expect } from 'vitest';

import { convertRuleset } from '../../convert-ruleset.js';

import { MLDocument } from './document.js';

function createDocument(
	sourceCode: string,
	options?: {
		readonly componentNameVariants?: boolean;
		readonly isNativeTag?: (name: string) => boolean;
		readonly pretenders?: readonly Pretender[];
	},
) {
	return new MLDocument(
		parser.parse(sourceCode),
		convertRuleset(),
		[spec as unknown as MLMLSpec, {}],
		{ ariaVersion: ARIA_RECOMMENDED_VERSION },
		options,
	);
}

describe('MLElement#tagNameKind', () => {
	test.each([
		['<button></button>', 'button', 'native'],
		['<foobar></foobar>', 'foobar', 'unknown-html'],
		['<foo-bar></foo-bar>', 'foo-bar', 'component'],
	])('%s in a document that resolves a component by any spelling of its name', (html, selector, expected) => {
		const el = createDocument(html, { componentNameVariants: true }).querySelector(selector);

		expect(el?.tagNameKind).toBe(expected);
	});

	test.each([[undefined], [false]])('is absent when componentNameVariants is %s', flag => {
		const document = createDocument('<button></button><foobar></foobar><foo-bar></foo-bar>', {
			componentNameVariants: flag,
		});

		expect(document.querySelector('button')?.tagNameKind).toBeUndefined();
		expect(document.querySelector('foobar')?.tagNameKind).toBeUndefined();
		expect(document.querySelector('foo-bar')?.tagNameKind).toBeUndefined();
	});

	test('is absent for an element of the SVG namespace, which keeps the case of its name', () => {
		const document = createDocument('<svg><clipPath></clipPath></svg>', { componentNameVariants: true });

		expect(document.querySelector('svg')?.tagNameKind).toBeUndefined();
		expect(document.querySelector('clipPath')?.tagNameKind).toBeUndefined();
	});

	test('follows the pretender', () => {
		const document = createDocument('<foo-bar></foo-bar>', {
			componentNameVariants: true,
			pretenders: [{ selector: 'foo-bar', as: 'img' }],
		});
		const el = document.querySelector('img');

		expect(el?.tagNameKind).toBe('native');
	});
});

describe('A type selector in a document that resolves a component by any spelling of its name', () => {
	const options = { componentNameVariants: true };

	test.each([
		['<foo-bar></foo-bar>', 'foo-bar', 'FooBar', true],
		['<foo-bar></foo-bar>', 'foo-bar', 'fooBar', true],
		['<foo-bar></foo-bar>', 'foo-bar', 'foo-bar', true],
		['<foo-bar></foo-bar>', 'foo-bar', 'foobar', false],
		['<foobar></foobar>', 'foobar', 'FooBar', false],
		['<foobar></foobar>', 'foobar', 'foobar', true],
		['<foobar></foobar>', 'foobar', 'Foobar', true],
		['<button></button>', 'button', 'button', true],
		['<button></button>', 'button', 'Button', false],
		['<svg><clipPath></clipPath></svg>', 'clipPath', 'clipPath', true],
		['<svg><clipPath></clipPath></svg>', 'clipPath', 'clippath', false],
	])('%s: the selector %s is not %s (matches: %s)', (html, query, selector, expected) => {
		const el = createDocument(html, options).querySelector(query);

		expect(el?.matches(selector)).toBe(expected);
	});

	test('is compared as it was in a document that does not', () => {
		const el = createDocument('<foobar></foobar><button></button>').querySelector('foobar');

		expect(el?.matches('FooBar')).toBe(true);
		expect(createDocument('<button></button>').querySelector('button')?.matches('Button')).toBe(true);
	});

	test('a pretended element is matched by the name of the pretender and by its own name', () => {
		const el = createDocument('<foo-bar></foo-bar>', {
			...options,
			pretenders: [{ selector: 'foo-bar', as: 'img' }],
		}).querySelector('img');

		expect(el?.matches('img')).toBe(true);
		expect(el?.matches('FooBar')).toBe(true);
		expect(el?.matches('Img')).toBe(false);
	});
});

describe('MLElement#matchesTagNameVariant', () => {
	const options = { componentNameVariants: true };

	test.each([
		['<foo-bar></foo-bar>', 'foo-bar', 'FooBar', true],
		['<foo-bar></foo-bar>', 'foo-bar', 'fooBar', true],
		['<foo-bar></foo-bar>', 'foo-bar', 'foo-bar', true],
		['<foo-bar></foo-bar>', 'foo-bar', 'FooBaz', false],
		['<foobar></foobar>', 'foobar', 'FooBar', false],
		['<button></button>', 'button', 'Button', false],
	])('%s: the name %s is not %s (matches: %s)', (html, query, name, expected) => {
		const el = createDocument(html, options).querySelector(query);

		expect(el?.matchesTagNameVariant(name)).toBe(expected);
	});

	test('is false in a document that does not resolve a component by any spelling of its name', () => {
		const el = createDocument('<foo-bar></foo-bar>').querySelector('foo-bar');

		expect(el?.matchesTagNameVariant('FooBar')).toBe(false);
		expect(el?.matchesTagNameVariant('foo-bar')).toBe(false);
	});

	test('takes the name the element is written with, not the one of its pretender', () => {
		const el = createDocument('<foo-bar></foo-bar>', {
			...options,
			pretenders: [{ selector: 'foo-bar', as: 'img' }],
		}).querySelector('img');

		expect(el?.matchesTagNameVariant('FooBar')).toBe(true);
		expect(el?.matchesTagNameVariant('img')).toBe(false);
		// The pretender is back after the question
		expect(el?.matches('img')).toBe(true);
	});
});

// Vue resolves the tag that its `isNativeTag` does not take (`<marquee>`, `<search>`) to a component, whatever the
// specification says; a document whose parser says nothing takes the specification as native.
describe('A parser that says which tags are native (MLParser#isNativeTag)', () => {
	const vueLike = new Set(['button', 'div', 'svg', 'mesh']);
	const isNativeTag = (name: string) => vueLike.has(name);
	const options = { componentNameVariants: true, isNativeTag };

	test.each([
		['<button></button>', 'button', 'native'],
		['<marquee></marquee>', 'marquee', 'unknown-html'],
		['<search></search>', 'search', 'unknown-html'],
	])('%s is %s for tagNameKind', (html, selector, expected) => {
		const el = createDocument(html, options).querySelector(selector);

		expect(el?.tagNameKind).toBe(expected);
	});

	test('without it the specification decides: <marquee> is native', () => {
		const el = createDocument('<marquee></marquee>', { componentNameVariants: true }).querySelector('marquee');

		expect(el?.tagNameKind).toBe('native');
	});

	test.each([
		['<marquee></marquee>', 'marquee', 'Marquee', true],
		['<marquee></marquee>', 'marquee', 'marquee', true],
		['<search></search>', 'search', 'Search', true],
		['<button></button>', 'button', 'Button', false],
	])('%s: the selector %s -> %s matches: %s', (html, query, selector, expected) => {
		const el = createDocument(html, options).querySelector(query);

		expect(el?.matches(selector)).toBe(expected);
	});

	test('without the rule of the parser a pretender does not apply to an element of MathML that has a specification', () => {
		const document = createDocument('<math><mi></mi></math>', {
			componentNameVariants: true,
			pretenders: [{ selector: 'mi', as: 'img' }],
		});

		expect(document.querySelector('mi')?.pretenderContext).toBeNull();
	});

	test('a pretender applies to a tag that it does not take for native', () => {
		const document = createDocument('<marquee><span>c</span></marquee>', {
			...options,
			pretenders: [{ selector: 'marquee', as: 'img' }],
		});

		expect(document.querySelector('marquee')?.pretenderContext?.type).toBe('pretender');
	});

	test('a pretender does not apply to a tag that it takes for native', () => {
		const document = createDocument('<button></button>', {
			...options,
			pretenders: [{ selector: 'button', as: 'img' }],
		});

		expect(document.querySelector('button')?.pretenderContext).toBeNull();
	});

	test('a pretender does not apply to a native tag that has no specification, which the parser knows', () => {
		const document = createDocument('<svg><mesh></mesh></svg>', {
			...options,
			pretenders: [{ selector: 'mesh', as: 'img' }],
		});

		expect(document.querySelector('mesh')?.pretenderContext).toBeNull();
	});

	// `as` names the element, not a tag to resolve: `as: 'marquee'` is the element whatever the parser's list holds
	test('the element a pretender stands for is judged by the specification', () => {
		const document = createDocument('<foo-bar></foo-bar>', {
			...options,
			pretenders: [{ selector: 'foo-bar', as: 'marquee' }],
		});
		const el = document.querySelector('marquee');

		expect(el?.tagNameKind).toBe('native');
		expect(el?.matches('Marquee')).toBe(false);
	});

	test('without it the specification guards the pretender: <marquee> is left as it is', () => {
		const document = createDocument('<marquee></marquee>', {
			componentNameVariants: true,
			pretenders: [{ selector: 'marquee', as: 'img' }],
		});

		expect(document.querySelector('marquee')?.pretenderContext).toBeNull();
	});
});
