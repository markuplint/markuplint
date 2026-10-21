import { describe, test, expect } from 'vitest';

import { setGlobal } from './global-settings.js';
import { mlTest } from './testing-tool/index.js';

setGlobal({
	locale: 'en',
});

/**
 * A pretender is looked up by a type selector. HTML names its elements case-insensitively,
 * but a parser that tells the case of a tag name apart (JSX, Svelte, Astro, MDX) has
 * `<foobar>` and `<FooBar>` as two names: `<foobar>` must not be taken for the component
 * `FooBar`.
 *
 * `FooBar` pretends to be a `span`, which a `p` permits. An element that is not resolved is
 * an unknown element, which `permitted-contents` reports in a `p`.
 */

const pretenders = [{ selector: 'FooBar', as: 'span' }];

async function lint(tag: string, parser: string) {
	const { violations } = await mlTest(`<p><${tag}>x</${tag}></p>`, {
		parser: { '.*': parser },
		pretenders,
		rules: { 'permitted-contents': true },
	});
	return violations.map(v => v.raw);
}

const caseSensitiveParsers = ['jsx', 'svelte', 'astro', 'mdx'];

describe('a pretender and the case of a tag name', () => {
	test.each(caseSensitiveParsers)('%s: the component with the name of the selector is resolved', async parser => {
		expect(await lint('FooBar', `@markuplint/${parser}-parser`)).toStrictEqual([]);
	});

	test.each(caseSensitiveParsers)(
		'%s: an element that differs from the name only by the case is not the component',
		async parser => {
			expect(await lint('foobar', `@markuplint/${parser}-parser`)).toStrictEqual(['<foobar>']);
		},
	);

	test('HTML: the case of a tag name is not told apart', async () => {
		expect(await lint('foobar', '@markuplint/html-parser')).toStrictEqual([]);
	});
});

describe('a selector of nodeRules and the case of a tag name', () => {
	async function lintDiv(selector: string, parser: string) {
		const { violations } = await mlTest('<div></div>', {
			parser: { '.*': parser },
			rules: {},
			nodeRules: [{ selector, rules: { 'require-attr': 'id' } }],
		});
		return violations.map(v => `${v.ruleId}: ${v.raw}`);
	}

	test.each(caseSensitiveParsers)('%s: a selector in another case than the tag does not match', async parser => {
		expect(await lintDiv('DIV', `@markuplint/${parser}-parser`)).toStrictEqual([]);
	});

	test.each(caseSensitiveParsers)('%s: a selector in the case of the tag matches', async parser => {
		expect(await lintDiv('div', `@markuplint/${parser}-parser`)).toStrictEqual(['require-attr: <div>']);
	});

	test('HTML: a selector in another case than the tag matches', async () => {
		expect(await lintDiv('DIV', '@markuplint/html-parser')).toStrictEqual(['require-attr: <div>']);
	});
});
