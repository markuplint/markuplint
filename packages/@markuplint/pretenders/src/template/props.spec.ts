import path from 'node:path';

import { describe, expect, test } from 'vitest';

import { templateScanner } from './index.js';

const fixtureDir = path.resolve(import.meta.dirname, '..', '..', 'test', 'fixtures', 'template');

async function scan(name: string) {
	const [pretender] = await templateScanner([path.resolve(fixtureDir, name)]);
	return pretender?.as;
}

/**
 * An attribute that forwards a prop of the component: it takes the value that the usage site
 * writes, and is omitted when the usage site does not write it.
 */
const forward = (name: string, prop: string) => ({ name, value: { fromAttr: prop, omitIfMissing: true } });

describe('templateScanner: an attribute that forwards a prop of the component', () => {
	test('[vue] defineProps: a name that is a prop, and an expression that is not just a name', async () => {
		expect(await scan('PropsLabel.vue')).toStrictEqual({
			element: 'button',
			attrs: [forward('aria-label', 'label'), { name: 'data-size', value: { dynamic: true } }],
			slots: true,
		});
	});

	test('[vue] the wrapper of the slot', async () => {
		expect(await scan('PropsWrapper.vue')).toStrictEqual({
			element: 'div',
			slots: [{ element: 'span', attrs: [forward('title', 'label')] }],
		});
	});

	test('[vue] an element of the contents, with a property of the props object', async () => {
		expect(await scan('PropsContents.vue')).toStrictEqual({
			element: 'div',
			slots: true,
			contents: [{ element: 'i', attrs: [forward('aria-label', 'label')] }, { slot: true }],
		});
	});

	test('[svelte] $props(): a destructured prop, a prop with a default, and the rest as a spread', async () => {
		expect(await scan('PropsRest.svelte')).toStrictEqual({
			element: 'button',
			attrs: [forward('aria-label', 'label'), { name: 'data-size', value: { dynamic: true } }],
			slots: true,
			inheritAttrs: true,
		});
	});

	test('[svelte] export let, and $$restProps as a spread', async () => {
		expect(await scan('PropsLegacy.svelte')).toStrictEqual({
			element: 'button',
			attrs: [forward('aria-label', 'label'), { name: 'data-size', value: { dynamic: true } }],
			slots: true,
			inheritAttrs: true,
		});
	});

	test('[astro] Astro.props destructured, and the rest as a spread', async () => {
		expect(await scan('PropsRest.astro')).toStrictEqual({
			element: 'button',
			attrs: [forward('aria-label', 'label'), { name: 'data-size', value: { dynamic: true } }],
			slots: true,
			inheritAttrs: true,
		});
	});

	test('[astro] a property of the props object, and Astro.props as a spread', async () => {
		expect(await scan('PropsObject.astro')).toStrictEqual({
			element: 'button',
			attrs: [forward('aria-label', 'label')],
			slots: true,
			inheritAttrs: true,
		});
	});
});

describe('templateScanner: inheritAttrs', () => {
	test('[vue] v-bind="$attrs" on the root hands the attributes over', async () => {
		expect(await scan('AttrsSpread.vue')).toStrictEqual({
			element: 'button',
			attrs: [forward('aria-label', 'label')],
			slots: true,
			inheritAttrs: true,
		});
	});

	test('[vue] a component that declares props is not taken to inherit, as they would be validated as attributes', async () => {
		expect(await scan('PropsLabel.vue')).not.toHaveProperty('inheritAttrs');
	});

	test('[vue] inheritAttrs: false turns the fallthrough off', async () => {
		expect(await scan('NoFallthrough.vue')).toStrictEqual({
			element: 'button',
			attrs: [{ name: 'type', value: 'button' }],
			slots: true,
		});
	});

	test('[vue] text of the template that looks like the script says nothing about the script', async () => {
		expect(await scan('TemplateText.vue')).toStrictEqual({
			element: 'button',
			attrs: [
				{ name: 'type', value: 'button' },
				{ name: 'title', value: 'inheritAttrs: false, props: none' },
			],
			slots: true,
			inheritAttrs: true,
		});
	});

	test('[vue] a template with several roots falls nothing through', async () => {
		expect(await scan('SiblingRoots.vue')).toStrictEqual({
			element: 'button',
			attrs: [{ name: 'type', value: 'button' }],
			slots: true,
		});
	});

	test('[svelte] a spread of something that is not the props does not hand them over', async () => {
		expect(await scan('SpreadOther.svelte')).toStrictEqual({
			element: 'button',
			attrs: [forward('aria-label', 'label')],
			slots: true,
		});
	});
});
