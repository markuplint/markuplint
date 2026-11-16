import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

const svelte = { parser: { '.*': '@markuplint/svelte-parser' } };

test('[require-datetime-issue-4580-001] an expression in a branch of a conditional block may render the date and time', async () => {
	expect((await mlRuleTest(rule, '<time>{#if a}{date}{/if}</time>', svelte)).violations).toStrictEqual([]);
});

test('[require-datetime-issue-4580-002] a component in a branch of a conditional block may render the date and time', async () => {
	expect((await mlRuleTest(rule, '<time>{#if a}<FormattedDate />{/if}</time>', svelte)).violations).toStrictEqual([]);
});

test('[require-datetime-issue-4580-003] an expression in a loop block may render the date and time', async () => {
	expect((await mlRuleTest(rule, '<time>{#each xs as x}{x}{/each}</time>', svelte)).violations).toStrictEqual([]);
});
