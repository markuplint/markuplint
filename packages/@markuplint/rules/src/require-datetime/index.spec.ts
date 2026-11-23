import { mlRuleTest } from 'markuplint';
import { describe, expect, test } from 'vitest';

import rule from './index.js';

test('[require-datetime-001] Valid', async () => {
	expect((await mlRuleTest(rule, '<time>2000-01-01</time>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<time datetime="2000-01-01">2000/01/01</time>')).violations).toStrictEqual([]);
});

test('[require-datetime-002] Mutable', async () => {
	expect(
		(
			await mlRuleTest(rule, '<time>{foo}</time>', {
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
			})
		).violations,
	).toStrictEqual([]);
});

test('[require-datetime-003] a time in the content of a template is checked', async () => {
	expect((await mlRuleTest(rule, '<template><time>Content</time></template>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 11,
			raw: '<time>',
			message: 'Need the "datetime" attribute',
		},
	]);
});

test('[require-datetime-004] Need', async () => {
	expect((await mlRuleTest(rule, '<time>Content</time>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			raw: '<time>',
			message: 'Need the "datetime" attribute',
		},
	]);
});

test('[require-datetime-005] Candidates', async () => {
	expect((await mlRuleTest(rule, '<time>2000/01/01</time>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			raw: '<time>',
			message: 'Need datetime="2000-01-01"',
		},
	]);

	expect((await mlRuleTest(rule, '<time>令和5年1月3日</time>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			raw: '<time>',
			message: 'Need datetime="2023-01-03"',
		},
	]);
});

test('[require-datetime-006] The `as` attribute', async () => {
	expect((await mlRuleTest(rule, '<x-time as="time">2000/01/01</x-time>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			raw: '<x-time as="time">',
			message: 'Need datetime="2000-01-01"',
		},
	]);

	expect((await mlRuleTest(rule, '<x-time as="time">令和5年1月3日</x-time>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			raw: '<x-time as="time">',
			message: 'Need datetime="2023-01-03"',
		},
	]);
});

/**
 * A component that no pretender resolved renders something that is not known: it may render
 * the text that is a valid date and time.
 */
describe('A component that no pretender resolved', () => {
	const jsx = {
		parser: {
			'.*': '@markuplint/jsx-parser',
		},
	};

	test('[require-datetime-007] the component in time may render the date and time', async () => {
		expect((await mlRuleTest(rule, '<time><FormattedDate /></time>', jsx)).violations).toStrictEqual([]);
	});

	test('[require-datetime-008] a component in a descendant of time may render the date and time', async () => {
		expect((await mlRuleTest(rule, '<time><b><FormattedDate /></b></time>', jsx)).violations).toStrictEqual([]);
	});

	test('[require-datetime-009] a component that a pretender resolved is the element that it renders', async () => {
		const { violations } = await mlRuleTest(rule, '<time><FormattedDate /></time>', {
			...jsx,
			pretenders: [{ selector: 'FormattedDate', as: 'span' }],
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				raw: '<time>',
				message: 'Need the "datetime" attribute',
			},
		]);
	});

	test('[require-datetime-010] text beside a component may be completed by it', async () => {
		expect((await mlRuleTest(rule, '<time>2026<FormattedDate /></time>', jsx)).violations).toStrictEqual([]);
	});

	test('[require-datetime-011] a component inside an element that a pretender resolved is not known either', async () => {
		const { violations } = await mlRuleTest(rule, '<time><span><FormattedDate /></span></time>', {
			...jsx,
			pretenders: [{ selector: 'span', as: 'span' }],
		});
		expect(violations).toStrictEqual([]);
	});
});

describe('issue-4580', () => {
	const svelte = { parser: { '.*': '@markuplint/svelte-parser' } };

	test('[require-datetime-012] an expression in a branch of a conditional block may render the date and time', async () => {
		expect((await mlRuleTest(rule, '<time>{#if a}{date}{/if}</time>', svelte)).violations).toStrictEqual([]);
	});

	test('[require-datetime-013] a component in a branch of a conditional block may render the date and time', async () => {
		expect((await mlRuleTest(rule, '<time>{#if a}<FormattedDate />{/if}</time>', svelte)).violations).toStrictEqual(
			[],
		);
	});

	test('[require-datetime-014] an expression in a loop block may render the date and time', async () => {
		expect((await mlRuleTest(rule, '<time>{#each xs as x}{x}{/each}</time>', svelte)).violations).toStrictEqual([]);
	});
});
