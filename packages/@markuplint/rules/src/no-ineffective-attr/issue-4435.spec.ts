import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

const jsx = { parser: { '.*': '@markuplint/jsx-parser' } };

test('[no-ineffective-attr-issue-4435-001] an attribute that the framework renders is judged as before', async () => {
	const { violations } = await mlRuleTest(rule, '<script defer={true}>const foo = "foo";</script>', jsx);
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 9,
			message: 'The "defer" attribute is ineffective. It doesn\'t need the attribute',
			raw: 'defer={true}',
		},
	]);
});

test('[no-ineffective-attr-issue-4435-002] code that is not a literal may be rendered, and is judged as before', async () => {
	const { violations } = await mlRuleTest(rule, '<script defer={cond}>const foo = "foo";</script>', jsx);
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 9,
			message: 'The "defer" attribute is ineffective. It doesn\'t need the attribute',
			raw: 'defer={cond}',
		},
	]);
});

test('[no-ineffective-attr-issue-4435-003] an attribute that the framework does not output is not an attribute of the element', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<><script defer={false}>const foo = "foo";</script><script defer={null}>const foo = "foo";</script></>',
		jsx,
	);
	expect(violations).toStrictEqual([]);
});
