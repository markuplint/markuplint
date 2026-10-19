import type { ImportBinding } from './types.js';

import { describe, expect, test } from 'vitest';

import { analyzeImports, isComponentBinding } from './index.js';

function binding(localName: string): ImportBinding {
	return { localName, importedName: 'default', source: `./${localName}`, type: 'default' };
}

// The name of a component is the rule of the parser of the language of the file: `analyzeImports` loads it,
// and `isComponentBinding` asks it.
describe('isComponentBinding after analyzeImports', () => {
	test.each([
		// JSX: a component unless it starts with a lowercase ASCII letter
		['page.tsx', '_Layout', true],
		['page.tsx', '$Ui', true],
		['page.tsx', 'Ärger', true],
		['page.tsx', 'Foo', true],
		['page.tsx', 'myButton', false],
		['page.jsx', '_Layout', true],
		['page.ts', '_Layout', true],
		['page.mdx', '_Layout', true],
		['page.mdx', 'myButton', false],
		// Svelte: a capital initial or a `.`
		['page.svelte', 'Foo', true],
		['page.svelte', '_Layout', false],
		['page.svelte', 'myButton', false],
		// Astro: a capital initial
		['page.astro', 'Foo', true],
		['page.astro', '_Layout', false],
		['page.astro', 'myButton', false],
		// Vue resolves a tag to a binding of any name
		['page.vue', 'myButton', true],
		['page.vue', 'card', true],
	])('%s: %s is %s', async (file, localName, expected) => {
		await analyzeImports(file, '');

		expect(isComponentBinding(binding(localName), file)).toBe(expected);
	});

	test('a file whose language is unknown is judged by the form that most languages share', () => {
		expect(isComponentBinding(binding('Foo'), 'page.unknown')).toBe(true);
		expect(isComponentBinding(binding('_Layout'), 'page.unknown')).toBe(false);
	});
});
