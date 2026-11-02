import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-default-value-issue-4435-001] a literal that is the default value is reported', async () => {
	const { violations } = await mlRuleTest(rule, '<input type={"text"} />', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([
		{ severity: 'warning', line: 1, col: 14, message: 'It is the default value', raw: '"text"' },
	]);
});

test('[no-default-value-issue-4435-002] code that is not a literal is not the default value', async () => {
	const { violations } = await mlRuleTest(rule, '<input type={cond} />', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([]);
});

test('[no-default-value-issue-4435-003] an attribute that the framework does not output is not the default value', async () => {
	const { violations } = await mlRuleTest(rule, '<input type={null} />', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([]);
});
