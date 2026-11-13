import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

const svelte = { parser: { '.*': '@markuplint/svelte-parser' } };

test('[no-redundant-accessible-name-issue-4580-001] the text in a branch of a conditional block is content that aria-label overrides', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="button" aria-label="X">{#if a}Save{/if}</div>', svelte);
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 1,
			raw: '<div role="button" aria-label="X">',
			message: 'The accessible name from "aria-label" overrides "content"',
		},
	]);
});

test('[no-redundant-accessible-name-issue-4580-002] no branch has content, so aria-label overrides nothing', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div role="button" aria-label="X">{#if a}<span></span>{/if}</div>',
		svelte,
	);
	expect(violations).toStrictEqual([]);
});

test('[no-redundant-accessible-name-issue-4580-003] a legend in a branch of a conditional block is a name that aria-label overrides', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<fieldset aria-label="X">{#if a}<legend>Name</legend>{/if}</fieldset>',
		svelte,
	);
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 1,
			raw: '<fieldset aria-label="X">',
			message: 'The accessible name from "aria-label" overrides "legend"',
		},
	]);
});

test('[no-redundant-accessible-name-issue-4580-004] a caption in a branch of a conditional block is a name that aria-label overrides', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<table aria-label="X">{#if a}<caption>Name</caption>{/if}</table>',
		svelte,
	);
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 1,
			raw: '<table aria-label="X">',
			message: 'The accessible name from "aria-label" overrides "caption"',
		},
	]);
});
