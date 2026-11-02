import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-broken-fragment-link-issue-4435-001] the id that is a literal is the id the element has, a character reference of it is not decoded', async () => {
	const { violations } = await mlRuleTest(rule, '<><div id={"a&amp;b"}></div><a href={"#a&amp;b"}></a></>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([]);
});

test('[no-broken-fragment-link-issue-4435-002] an id that the framework does not output is not an id', async () => {
	const { violations } = await mlRuleTest(rule, '<><div id={null}></div><a href="#x"></a></>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([{ severity: 'warning', line: 1, col: 33, message: 'Missing "x" ID', raw: '#x' }]);
});
