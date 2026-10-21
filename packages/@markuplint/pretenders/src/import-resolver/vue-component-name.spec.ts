import type { ImportBinding } from './types.js';

import { beforeAll, describe, expect, test } from 'vitest';

import { loadComponentNameRule } from '../scanner-loader.js';

import {
	analyzeImports,
	isComponentBinding,
	resolveComponentImport,
	resolveSelectorImport,
	vueSetupNames,
} from './index.js';

// `analyzeImports` and `scan` load the Vue parser when they read a Vue file; most specs here resolve
// bindings they are given without reading one, so the parser is loaded for them first.
beforeAll(async () => {
	await loadComponentNameRule('.vue');
});

function binding(localName: string, type: ImportBinding['type'] = 'default'): ImportBinding {
	return {
		localName,
		importedName: type === 'namespace' ? '*' : 'default',
		source: `./${localName}.vue`,
		type,
	};
}

describe('resolveComponentImport of a tag in a Vue file', () => {
	const vue = 'page.vue';

	test.each([
		// `resolveSetupReference` of Vue: the tag as written, camelized, or capitalized after camelizing
		['FooBar', 'FooBar'],
		['fooBar', 'fooBar'],
		['fooBar', 'FooBar'],
		['foo-bar', 'FooBar'],
		['foo-bar', 'fooBar'],
		['myButton', 'myButton'],
		['my-button', 'myButton'],
		['card', 'card'],
		// `card` is no native tag, so Vue resolves it to a component: `isNativeTag` of Vue
		['card', 'Card'],
		// The lists of Vue do not have `marquee`, so it is a component to Vue, though markuplint has a specification for it
		['marquee', 'Marquee'],
	])('<%s> is the binding %s', (tag, localName) => {
		const target = binding(localName);
		expect(resolveComponentImport(tag, [target], vue)).toBe(target);
	});

	test.each([
		['FooBar', 'fooBar'],
		['FooBar', 'foo-bar'],
		['foobar', 'FooBar'],
		['foo-bar', 'Foobar'],
		['Card', 'card'],
		// A native element, which Vue never resolves to a component
		['button', 'Button'],
		['circle', 'Circle'],
		['mi', 'Mi'],
		// The camelCase of SVG is native too
		['clipPath', 'ClipPath'],
	])('<%s> is not the binding %s', (tag, localName) => {
		expect(resolveComponentImport(tag, [binding(localName)], vue)).toBeUndefined();
	});

	test('a native tag is not the binding of the same name', () => {
		const sameName = binding('button');

		expect(resolveComponentImport('button', [sameName], vue)).toBeUndefined();
		expect(resolveComponentImport('circle', [binding('circle')], vue)).toBeUndefined();
		// A tag that is no native one is
		expect(resolveComponentImport('card', [binding('card')], vue)).toBeDefined();
	});

	test('the tag as written wins over the camelized one, which wins over the capitalized one', () => {
		const written = binding('foo-bar');
		const camel = binding('fooBar');
		const pascal = binding('FooBar');

		expect(resolveComponentImport('foo-bar', [pascal, camel, written], vue)).toBe(written);
		expect(resolveComponentImport('foo-bar', [pascal, camel], vue)).toBe(camel);
		expect(resolveComponentImport('foo-bar', [pascal], vue)).toBe(pascal);
	});

	test('a dotted tag is the binding registered under it in the components of the Options API', async () => {
		const { bindings } = (await analyzeImports(
			vue,
			`<script>
import Item from './Item.vue'
export default { components: { 'ui.Item': Item } }
</script>`,
		))!;

		expect(bindings).toStrictEqual([
			{
				localName: 'Item',
				importedName: 'default',
				source: './Item.vue',
				type: 'default',
				registeredAs: 'ui.Item',
			},
		]);
		expect(resolveComponentImport('ui.Item', bindings, vue)).toBe(bindings[0]);
		// Not by the name of the binding, which the template does not know
		expect(resolveComponentImport('Item', bindings, vue)).toBeUndefined();
		expect(resolveComponentImport('ui.item', bindings, vue)).toBeUndefined();
	});

	test('a file of another language is looked up as before', () => {
		const target = binding('FooBar');
		for (const file of ['page.tsx', 'page.svelte', 'page.astro', 'page.mdx']) {
			expect(resolveComponentImport('foo-bar', [target], file)).toBe(target);
			expect(resolveComponentImport('fooBar', [target], file)).toBeUndefined();
			expect(resolveComponentImport('card', [binding('Card')], file)).toBeUndefined();
		}
	});
});

describe('vueSetupNames', () => {
	test.each([
		['foo-bar', ['foo-bar', 'fooBar', 'FooBar']],
		['fooBar', ['fooBar', 'FooBar']],
		['FooBar', ['FooBar']],
		['card', ['card', 'Card']],
		['marquee', ['marquee', 'Marquee']],
		// A native tag is looked up under no name: Vue never resolves it to a component, an import of the same name included
		['button', []],
		['clipPath', []],
	])('<%s>', (tag, expected) => {
		expect(vueSetupNames(tag)).toStrictEqual(expected);
	});
});

describe('resolveSelectorImport', () => {
	test.each([
		['FooBar', 'FooBar'],
		['FooBar', 'fooBar'],
		['foo-bar', 'FooBar'],
		['Item', 'item'],
	])('the selector %s is the binding %s in a Vue file', (selector, localName) => {
		const target = binding(localName);
		expect(resolveSelectorImport(selector, [target], 'page.vue')).toBe(target);
	});

	test.each([
		['FooBar', 'foobar'],
		['item', 'Item'],
		['FooBar', 'FooBaz'],
	])('the selector %s is not the binding %s in a Vue file', (selector, localName) => {
		expect(resolveSelectorImport(selector, [binding(localName)], 'page.vue')).toBeUndefined();
	});

	test('a file of another language is looked up as before', () => {
		const target = binding('FooBar');
		expect(resolveSelectorImport('FooBar', [target], 'page.tsx')).toBe(target);
		expect(resolveSelectorImport('foo-bar', [target], 'page.tsx')).toBe(target);
		expect(resolveSelectorImport('FooBar', [binding('fooBar')], 'page.tsx')).toBeUndefined();
	});
});

describe('isComponentBinding', () => {
	test.each([
		['Foo', true],
		['myButton', true],
		['card', true],
	])('%s in a Vue file: %s', (localName, expected) => {
		expect(isComponentBinding(binding(localName), 'page.vue')).toBe(expected);
	});

	test.each(['page.tsx', 'page.jsx', 'page.svelte', 'page.astro', 'page.mdx'])(
		'only a name with a capital initial is one in %s',
		file => {
			expect(isComponentBinding(binding('Foo'), file)).toBe(true);
			expect(isComponentBinding(binding('myButton'), file)).toBe(false);
			expect(isComponentBinding(binding('card'), file)).toBe(false);
		},
	);
});
