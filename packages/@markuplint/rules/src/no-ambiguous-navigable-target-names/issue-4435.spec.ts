import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-ambiguous-navigable-target-names-issue-4435-001] a literal is judged as the string is', async () => {
	const { violations } = await mlRuleTest(rule, '<a href="x" target={"blank"}></a>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 21,
			message: 'Don\'t use a ambiguous navigable target name. Did you mean "_blank"?',
			raw: '"blank"',
		},
	]);
});

test('[no-ambiguous-navigable-target-names-issue-4435-002] code that is not a literal is not judged', async () => {
	const { violations } = await mlRuleTest(rule, '<a href="x" target={cond}></a>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([]);
});

test('[no-ambiguous-navigable-target-names-issue-4435-003] an attribute that the framework does not output is not judged', async () => {
	const { violations } = await mlRuleTest(rule, '<a href="x" target={null}></a>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([]);
});
