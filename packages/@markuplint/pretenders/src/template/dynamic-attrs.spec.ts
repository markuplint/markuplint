import path from 'node:path';

import { describe, test, expect } from 'vitest';

import { templateScanner } from './index.js';

const fixtureDir = path.resolve(import.meta.dirname, '..', '..', 'test', 'fixtures', 'template');

async function scan(name: string) {
	const [pretender] = await templateScanner([path.resolve(fixtureDir, name)]);
	return pretender?.as;
}

/**
 * Issue #4058: the template scanners copied the attributes of the root element
 * as they are written (`:type`, `@click`, `v-bind`), instead of saying that
 * `type` is present with a value that is not known at scan time.
 */
describe('templateScanner dynamic attributes (issue #4058)', () => {
	test('[vue] a binding is a dynamic attribute of its own name; events and directives are not attributes', async () => {
		expect(await scan('DynamicAttrs.vue')).toStrictEqual({
			element: 'button',
			attrs: [
				{ name: 'class', value: 'btn' },
				{ name: 'type', value: { dynamic: true } },
				{ name: 'tabindex', value: { dynamic: true } },
			],
			slots: null,
		});
	});

	test('[svelte] an expression is a dynamic attribute; directives other than bind are not attributes', async () => {
		expect(await scan('DynamicAttrs.svelte')).toStrictEqual({
			element: 'input',
			attrs: [
				{ name: 'class', value: 'field' },
				{ name: 'type', value: { dynamic: true } },
				{ name: 'disabled', value: { dynamic: true } },
				{ name: 'value', value: { dynamic: true } },
				{ name: 'data-id', value: { dynamic: true } },
			],
			slots: null,
		});
	});

	test('[astro] an expression is a dynamic attribute; directives are not attributes', async () => {
		expect(await scan('DynamicAttrs.astro')).toStrictEqual({
			element: 'input',
			attrs: [
				{ name: 'class', value: 'field' },
				{ name: 'type', value: { dynamic: true } },
				{ name: 'disabled', value: { dynamic: true } },
				{ name: 'data-id', value: { dynamic: true } },
			],
			slots: null,
		});
	});

	test('[vue] a name written both statically and as a binding is one dynamic attribute', async () => {
		expect(await scan('DuplicateAttrs.vue')).toStrictEqual({
			element: 'button',
			attrs: [
				{ name: 'class', value: { dynamic: true } },
				{ name: 'type', value: { dynamic: true } },
			],
			slots: null,
		});
	});

	test('[svelte] namespaced attributes stay static; a binding to a property that is not an attribute is left out', async () => {
		expect(await scan('NamespacedAttrs.svelte')).toStrictEqual({
			element: 'input',
			attrs: [
				{ name: 'xlink:href', value: '#a' },
				{ name: 'xml:lang', value: 'en' },
				{ name: 'open', value: { dynamic: true } },
				{ name: 'value', value: { dynamic: true } },
			],
			slots: null,
		});
	});

	test('[astro] namespaced attributes stay static even though the parser flags them as directives', async () => {
		expect(await scan('NamespacedAttrs.astro')).toStrictEqual({
			element: 'input',
			attrs: [
				{ name: 'xlink:href', value: '#a' },
				{ name: 'xml:lang', value: 'en' },
			],
			slots: null,
		});
	});
});
