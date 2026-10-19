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

test('[no-obsolete-attr-issue-4180-001] an attribute name written in upper case is matched case-insensitively', async () => {
	const { violations } = await mlRuleTest(rule, '<link rel="made" href="/author" REV="made">');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 33,
			raw: 'REV',
			message: 'The "rev" attribute is obsolete',
		},
	]);
});

test('[no-obsolete-attr-parser-001] a mixed-case JSX prop is not the obsolete HTML attribute', async () => {
	const { violations } = await mlRuleTest(rule, '<link rel="made" href="/author" Rev="made" />', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 33,
			raw: 'Rev',
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

test('[no-obsolete-attr-issue-4309-001] an HTML element in JSX folds the name', async () => {
	const options = { parser: { '.*': '@markuplint/jsx-parser' } };
	const upper = await mlRuleTest(rule, '<link rel="made" href="/author" REV="made" />', options);
	expect(upper.violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 33,
			raw: 'REV',
			message: 'The "rev" attribute is obsolete',
		},
	]);
	const lower = await mlRuleTest(rule, '<link rel="made" href="/author" rev="made" />', options);
	expect(lower.violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 33,
			raw: 'rev',
			message: 'The "rev" attribute is obsolete',
		},
	]);
});
