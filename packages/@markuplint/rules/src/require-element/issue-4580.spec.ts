import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

const svelte = { parser: { '.*': '@markuplint/svelte-parser' } };

test('[require-element-issue-4580-001] an expression in a branch of a conditional block may render the required element', async () => {
	const { violations } = await mlRuleTest(rule, '<main>{#if a}{content}{/if}</main>', {
		...svelte,
		rule: ['h1'],
	});
	expect(violations).toStrictEqual([]);
});

test('[require-element-issue-4580-002] a branch that renders only static content leaves the required element missing', async () => {
	const { violations } = await mlRuleTest(rule, '<main>{#if a}<p>a</p>{/if}</main>', {
		...svelte,
		rule: ['h1'],
	});
	expect(violations).toStrictEqual([
		{ severity: 'error', line: 1, col: 1, raw: '<', message: 'Require the "h1" element' },
	]);
});
