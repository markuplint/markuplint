import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

const svelte = { parser: { '.*': '@markuplint/svelte-parser' } };

test('[require-adjacent-popover-issue-4580-001] the text in a branch of a conditional block between the trigger and the popover is reported itself', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<button popovertarget="foo">Trigger</button><div role="img">{#if a}<span role="none">Name</span>{/if}</div><div id="foo" popover>Popover</div>',
		svelte,
	);
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 86,
			message: 'Detected perceptible nodes between the trigger and corresponding target',
			raw: 'Name',
		},
	]);
});

test('[require-adjacent-popover-issue-4580-002] a branch that has no perceptible node between the trigger and the popover is not reported', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<button popovertarget="foo">Trigger</button><div role="img">{#if a}<span></span>{/if}</div><div id="foo" popover>Popover</div>',
		svelte,
	);
	expect(violations).toStrictEqual([]);
});
