import path from 'node:path';

import { describe, test, expect } from 'vitest';

import { templateScanner } from './index.js';

const fixtureDir = path.resolve(import.meta.dirname, '..', '..', 'test', 'fixtures', 'template');

async function scan(name: string) {
	const [pretender] = await templateScanner([path.resolve(fixtureDir, name)]);
	return pretender?.as;
}

/**
 * An attribute written as code is reported as the code, whether or not it is a literal,
 * so that `@markuplint/ml-core` reads it as it reads an element written directly (`:disabled="false"` has
 * no `disabled`). Whether it is a literal is not decided by the scanner.
 */
describe('templateScanner expression attributes', () => {
	test('[vue] a binding is the code as it is written', async () => {
		expect(await scan('ExpressionAttrs.vue')).toStrictEqual({
			element: 'button',
			attrs: [
				{ name: 'aria-busy', value: { expression: 'true' } },
				{ name: 'disabled', value: { expression: 'false' } },
				{ name: 'title', value: { expression: "'x'" } },
				{ name: 'tabindex', value: { expression: 'selected ? 0 : -1' } },
				{ name: 'data-n', value: { expression: '0' } },
				{ name: 'hidden', value: { expression: 'kind' } },
			],
			slots: null,
			inheritAttrs: true,
		});
	});

	test('[svelte] an expression is the code as it is written, in quotes as well', async () => {
		expect(await scan('ExpressionAttrs.svelte')).toStrictEqual({
			element: 'button',
			attrs: [
				{ name: 'aria-busy', value: { expression: 'true' } },
				{ name: 'disabled', value: { expression: 'false' } },
				{ name: 'title', value: { expression: "'x'" } },
				{ name: 'tabindex', value: { expression: 'selected ? 0 : -1' } },
				{ name: 'data-n', value: { expression: '0' } },
				{ name: 'hidden', value: { expression: 'kind' } },
				// Text and an expression is a string whose value is not known
				{ name: 'data-id', value: { dynamic: true } },
			],
			slots: null,
		});
	});

	test('[svelte] an attachment is not an attribute', async () => {
		expect(await scan('AttachAttrs.svelte')).toStrictEqual({
			element: 'button',
			attrs: [{ name: 'class', value: 'a' }],
			slots: null,
		});
	});

	test('[astro] an expression is the code as it is written', async () => {
		expect(await scan('ExpressionAttrs.astro')).toStrictEqual({
			element: 'button',
			attrs: [
				{ name: 'aria-busy', value: { expression: 'true' } },
				{ name: 'disabled', value: { expression: 'false' } },
				{ name: 'title', value: { expression: "'x'" } },
				{ name: 'tabindex', value: { expression: 'selected ? 0 : -1' } },
				{ name: 'data-n', value: { expression: '0' } },
				{ name: 'hidden', value: { expression: 'kind' } },
				// A template literal with a substitution is not reported as one expression
				{ name: 'data-id', value: { dynamic: true } },
			],
			slots: null,
		});
	});
});
