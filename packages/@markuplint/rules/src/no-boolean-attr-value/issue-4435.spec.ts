import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-boolean-attr-value-issue-4435-001] a boolean that is written as code is not a value of the attribute', async () => {
	const { violations } = await mlRuleTest(rule, '<button disabled={false}></button>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([]);
});

test('[no-boolean-attr-value-issue-4435-002] a single expression in quotes of Svelte is an expression', async () => {
	const { violations } = await mlRuleTest(rule, '<button disabled="{false}"></button>', {
		parser: { '.*': '@markuplint/svelte-parser' },
		specs: { '.*': '@markuplint/svelte-spec' },
	});
	expect(violations).toStrictEqual([]);
});

test('[no-boolean-attr-value-issue-4435-003] a value that is written is reported as before', async () => {
	const { violations } = await mlRuleTest(rule, '<button disabled="disabled"></button>');
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 17,
			message: 'The "disabled" attribute is a boolean attribute. It doesn\'t need the value',
			raw: '="disabled"',
		},
	]);
});
