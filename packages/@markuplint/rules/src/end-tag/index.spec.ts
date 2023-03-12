// @ts-nocheck

import { mlRuleTest } from 'markuplint';

import rule from './';

it('basic', async () => {
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

it('HTML', async () => {
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

it('HTML', async () => {
	expect((await mlRuleTest(rule, '<div><img><img /></div>')).violations).toStrictEqual([]);
});

it('SVG', async () => {
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

it('pug', async () => {
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

it('React', async () => {
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

it('Vue', async () => {
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

it('Svelte', async () => {
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

it('Astro', async () => {
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
