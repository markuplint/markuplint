import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-refer-to-non-existent-id-issue-4435-001] the id that is a literal is the id the element has, a character reference of it is not decoded', async () => {
	const { violations } = await mlRuleTest(rule, '<><input id={"a&amp;b"} /><label htmlFor={"a&amp;b"}></label></>', {
		parser: { '.*': '@markuplint/jsx-parser' },
		specs: { '.*': '@markuplint/react-spec' },
	});
	expect(violations).toStrictEqual([]);
});

test('[no-refer-to-non-existent-id-issue-4435-002] an id that the framework does not output is not an id, nor an id that may be anything', async () => {
	const { violations } = await mlRuleTest(rule, '<><div id={null}></div><label htmlFor="x"></label></>', {
		parser: { '.*': '@markuplint/jsx-parser' },
		specs: { '.*': '@markuplint/react-spec' },
	});
	expect(violations).toStrictEqual([{ severity: 'error', line: 1, col: 40, message: 'Missing "x" ID', raw: 'x' }]);
});

test('[no-refer-to-non-existent-id-issue-4435-003] an id of code that is not a literal may be any', async () => {
	const { violations } = await mlRuleTest(rule, '<><div id={cond}></div><label htmlFor="x"></label></>', {
		parser: { '.*': '@markuplint/jsx-parser' },
		specs: { '.*': '@markuplint/react-spec' },
	});
	expect(violations).toStrictEqual([]);
});
