import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-unescaped-char-issue-4435-001] a literal in {…} is code, in which a character is not escaped as markup', async () => {
	const { violations } = await mlRuleTest(rule, '<div title={"a < b & c"}></div>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([]);
});
