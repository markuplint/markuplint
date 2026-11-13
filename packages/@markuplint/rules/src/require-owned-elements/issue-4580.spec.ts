import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

const svelte = { parser: { '.*': '@markuplint/svelte-parser' } };

test('[require-owned-elements-issue-4580-001] an expression in a branch of a conditional block may render the owned element', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="list">{#if a}{item}{/if}</div>', svelte);
	expect(violations).toStrictEqual([]);
});

test('[require-owned-elements-issue-4580-002] a component in a branch of a conditional block may render the owned element', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="list">{#if a}<Item />{/if}</div>', svelte);
	expect(violations).toStrictEqual([]);
});

test('[require-owned-elements-issue-4580-003] an owned element in a branch is an owned element', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div role="list">{#if a}<div role="listitem">a</div>{/if}</div>',
		svelte,
	);
	expect(violations).toStrictEqual([]);
});

test('[require-owned-elements-issue-4580-004] an expression in a loop block may render the owned element', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="list">{#each xs as x}{x}{/each}</div>', svelte);
	expect(violations).toStrictEqual([]);
});
