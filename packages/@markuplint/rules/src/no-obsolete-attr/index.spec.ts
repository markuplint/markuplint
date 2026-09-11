import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-obsolete-attr-invalid-001] obsolete attribute (link[charset])', async () => {
	const { violations } = await mlRuleTest(rule, '<link rel="alternate" href="/feed" charset="utf-8">');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 36,
			raw: 'charset',
			message: 'The "charset" attribute is obsolete',
		},
	]);
});

test('[no-obsolete-attr-invalid-002] obsolete attribute (link[rev])', async () => {
	const { violations } = await mlRuleTest(rule, '<link rel="made" href="/author" rev="made">');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 33,
			raw: 'rev',
			message: 'The "rev" attribute is obsolete',
		},
	]);
});

test('[no-obsolete-attr-valid-001] no obsolete attribute', async () => {
	const { violations } = await mlRuleTest(rule, '<link rel="alternate" href="/feed">');
	expect(violations).toStrictEqual([]);
});

test('[no-obsolete-attr-valid-002] a merely-deprecated attribute is not obsolete', async () => {
	const { violations } = await mlRuleTest(rule, '<img align="top">');
	expect(violations).toStrictEqual([]);
});
