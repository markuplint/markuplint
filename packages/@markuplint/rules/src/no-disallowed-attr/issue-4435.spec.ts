import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

const jsx = { parser: { '.*': '@markuplint/jsx-parser' } };

const disallowed = {
	severity: 'error',
	line: 1,
	col: 9,
	message: 'The "async" attribute is disallowed',
	raw: 'async',
};

test('[no-disallowed-attr-issue-4435-001] an attribute that the framework renders is judged as before', async () => {
	const { violations } = await mlRuleTest(rule, '<script async={true}></script>', jsx);
	expect(violations).toStrictEqual([disallowed]);
});

test('[no-disallowed-attr-issue-4435-002] code that is not a literal may be rendered, and is judged as before', async () => {
	const { violations } = await mlRuleTest(rule, '<script async={cond}></script>', jsx);
	expect(violations).toStrictEqual([disallowed]);
});

test('[no-disallowed-attr-issue-4435-003] an attribute that the framework does not output is not an attribute of the element', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<><script async={false}></script><script async={null}></script></>',
		jsx,
	);
	expect(violations).toStrictEqual([]);
});
