import { mlRuleTest } from 'markuplint';
import { test, expect, describe } from 'vitest';

import rule from './index.js';

test('[end-tag-valid-001] basic', async () => {
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

test('[end-tag-invalid-001] HTML', async () => {
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

test('[end-tag-valid-002] HTML', async () => {
	expect((await mlRuleTest(rule, '<div><img><img /></div>')).violations).toStrictEqual([]);
});

test('[end-tag-invalid-002] SVG', async () => {
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

test('[end-tag-parser-001] pug', async () => {
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

test('[end-tag-parser-002] React', async () => {
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

test('[end-tag-parser-003] Vue', async () => {
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

test('[end-tag-parser-004] Svelte', async () => {
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

test('[end-tag-parser-005] Astro', async () => {
	expect(
		(
			await mlRuleTest(rule, '<div><span><span /></div>', {
				parser: {
					'.*': '@markuplint/astro-parser',
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

describe('Issues', () => {
	test('[end-tag-issue-1349] #1349', async () => {
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
});
