import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[require-end-tag-001] basic', async () => {
	expect((await mlRuleTest(rule, '<html><body></body></html>')).violations.length).toBe(0);
	expect((await mlRuleTest(rule, '<html><body></body>')).violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 1,
			message: 'Missing the end tag',
			raw: '<html>',
		},
	]);
});

test('[require-end-tag-002] HTML', async () => {
	expect((await mlRuleTest(rule, '<div><span><span /></div>')).violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 6,
			message: 'Missing the end tag',
			raw: '<span>',
		},
		{
			severity: 'warning',
			line: 1,
			col: 12,
			message: 'Missing the end tag',
			raw: '<span />',
		},
	]);
});

test('[require-end-tag-003] HTML', async () => {
	expect((await mlRuleTest(rule, '<div><img><img /></div>')).violations).toStrictEqual([]);
});

test('[require-end-tag-004] SVG', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				`<svg>
	<defs>
		<clipPath>
			<circle />
			<circle></circle>
		</clipPath>
	</defs>
</svg>`,
			)
		).violations,
	).toStrictEqual([]);
});

test('[require-end-tag-005] pug', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				`html
	body
		p text`,
				{
					parser: {
						'.*': '@markuplint/pug-parser',
					},
				},
			)
		).violations.length,
	).toBe(0);
});

test('[require-end-tag-006] React', async () => {
	expect(
		(
			await mlRuleTest(rule, '<div><span><span /></div>', {
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
			})
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			message: "JSX element 'span' has no corresponding closing tag.",
			raw: '',
		},
	]);
});

test('[require-end-tag-007] Vue', async () => {
	expect(
		(
			await mlRuleTest(rule, '<template><div><span><span /></div></template>', {
				parser: {
					'.*': '@markuplint/vue-parser',
				},
			})
		).violations,
	).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 16,
			message: 'Missing the end tag',
			raw: '<span>',
		},
	]);
});

test('[require-end-tag-008] Svelte', async () => {
	expect(
		(
			await mlRuleTest(rule, '<div><span><span /></div>', {
				parser: {
					'.*': '@markuplint/svelte-parser',
				},
			})
		).violations,
	).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 6,
			message: 'Missing the end tag',
			raw: '<span>',
		},
	]);
});

test('[require-end-tag-009] Astro', async () => {
	expect(
		(
			await mlRuleTest(rule, '<div><span><span /></div>', {
				parser: {
					'.*': '@markuplint/astro-parser',
				},
			})
		).violations,
	).toStrictEqual([
		// With `@astrojs/compiler` the parser recovered from the missing end tag and this rule reported it:
		// {
		// 	severity: 'warning',
		// 	line: 1,
		// 	col: 6,
		// 	message: 'Missing the end tag',
		// 	raw: '<span>',
		// },
		// `astro-eslint-parser` v3 rejects the missing end tag, so the file is reported as a parse error.
		{
			severity: 'error',
			line: 1,
			col: 21,
			message: "ParserError: Expected corresponding JSX closing tag for 'span'.",
			raw: '',
		},
	]);
});

test('[require-end-tag-010] template syntax between the tags does not make an end tag missing in Nunjucks', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				`<tag1>
	<tag2>
		{% SYNTAX %}
		<tag3>
			{% SYNTAX %}
			<a class="{{ smm_class }} btn-smm-li">Text</a>
			{% SYNTAX %}
		</tag3>
		{% SYNTAX %}
	</tag2>
</tag1>`,
				{
					parser: {
						'.*': '@markuplint/nunjucks-parser',
					},
				},
			)
		).violations,
	).toStrictEqual([]);
});
