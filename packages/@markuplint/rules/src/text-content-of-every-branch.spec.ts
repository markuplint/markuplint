import { createTestDocument } from '@markuplint/ml-core';
import { describe, test, expect } from 'vitest';

import * as svelteParser from '@markuplint/svelte-parser';
import * as vueParser from '@markuplint/vue-parser';

import { textContentOfEveryBranch } from './helpers.js';

function textOf(selector: string, code: string, parser: typeof svelteParser | typeof vueParser) {
	const el = createTestDocument(code, { parser }).querySelector(selector);
	expect(el).not.toBeNull();
	return textContentOfEveryBranch(el!);
}

describe('textContentOfEveryBranch', () => {
	test('is the text of the element as written when there is no conditional block', () => {
		expect(textOf('div', '<div>a<b>b</b>c</div>', svelteParser)).toBe('abc');
	});

	test('does not include a comment, as Element#textContent does not', () => {
		expect(textOf('div', '<div>a<!-- c -->b{#if x}<!-- d -->e{/if}</div>', svelteParser)).toBe('abe');
	});

	test('joins the text of every branch, nested blocks and nested elements included', () => {
		expect(textOf('div', '<div>{#if a}x<b>{#if b}y{/if}</b>{:else}z{/if}</div>', svelteParser)).toBe('xyz');
	});

	test('reads the text of an element that has a directive of Vue and of the template that holds it', () => {
		expect(
			textOf('div', '<template><div><i v-if="a">x</i><template v-else>y</template></div></template>', vueParser),
		).toBe('xy');
	});
});
