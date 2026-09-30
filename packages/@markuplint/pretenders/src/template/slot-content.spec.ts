import path from 'node:path';

import { describe, test, expect } from 'vitest';

import { templateScanner } from './index.js';

const fixtureDir = path.resolve(import.meta.dirname, '..', '..', 'test', 'fixtures', 'template');

async function scan(name: string) {
	const [pretender] = await templateScanner([path.resolve(fixtureDir, name)]);
	return pretender?.as;
}

const img = {
	element: 'img',
	attrs: [
		{ name: 'src', value: 'a.gif' },
		{ name: 'alt', value: 'x' },
	],
};

describe.each(['vue', 'svelte', 'astro'])('templateScanner slot content: %s', ext => {
	test(`[${ext}] an inner element that directly wraps the slot is the slot wrapper`, async () => {
		expect(await scan(`NestedSlot.${ext}`)).toStrictEqual({
			element: 'div',
			attrs: [{ name: 'class', value: 'card' }],
			slots: [{ element: 'p' }],
		});
	});

	test(`[${ext}] a component with static children only keeps them in contents`, async () => {
		expect(await scan(`StaticPicture.${ext}`)).toStrictEqual({
			element: 'picture',
			slots: null,
			contents: [img],
		});
	});

	test(`[${ext}] the slot position among the static children is kept`, async () => {
		expect(await scan(`PictureSlot.${ext}`)).toStrictEqual({
			element: 'picture',
			slots: true,
			contents: [{ slot: true }, img],
		});
	});
});

describe('templateScanner slot content: unknown content', () => {
	test('[vue] an expression next to the slot is an unknown content', async () => {
		expect(await scan('DetailsDynamic.vue')).toStrictEqual({
			element: 'details',
			slots: true,
			contents: [{ dynamic: true }, { slot: true }],
		});
	});

	test('[svelte] a block next to the slot is an unknown content', async () => {
		expect(await scan('DetailsDynamic.svelte')).toStrictEqual({
			element: 'details',
			slots: true,
			contents: [{ dynamic: true }, { slot: true }],
		});
	});

	test('[vue] every distinct slot wrapper is listed', async () => {
		expect(await scan('TwoSlotWrappers.vue')).toStrictEqual({
			element: 'div',
			slots: [{ element: 'p' }, { element: 'ul' }],
		});
	});
});

describe.each(['vue', 'svelte', 'astro'])('templateScanner text content: %s', ext => {
	test(`[${ext}] text beside an element is an unknown content`, async () => {
		expect(await scan(`RubyText.${ext}`)).toStrictEqual({
			element: 'ruby',
			slots: null,
			contents: [{ dynamic: true }, { element: 'rt' }],
		});
	});
});

describe('templateScanner structural directives', () => {
	test('[vue] an element with v-if / v-else is an unknown content', async () => {
		expect(await scan('ConditionalSummary.vue')).toStrictEqual({
			element: 'details',
			slots: true,
			contents: [{ dynamic: true }, { dynamic: true }, { slot: true }],
		});
	});

	test('[vue] an element with v-for is an unknown content', async () => {
		expect(await scan('RepeatedItem.vue')).toStrictEqual({
			element: 'ul',
			slots: true,
			contents: [{ dynamic: true }, { slot: true }],
		});
	});
});
