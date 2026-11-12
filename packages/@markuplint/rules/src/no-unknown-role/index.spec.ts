import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-unknown-role-valid-001] valid role', async () => {
	expect((await mlRuleTest(rule, '<div role="button"></div>')).violations).toStrictEqual([]);
});

test('[no-unknown-role-valid-002] no role attr', async () => {
	expect((await mlRuleTest(rule, '<div></div>')).violations).toStrictEqual([]);
});

test('[no-unknown-role-invalid-001] non-existent role', async () => {
	expect((await mlRuleTest(rule, '<div role="hoge"></div>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 12,
			message: 'The "hoge" role does not exist according to the WAI-ARIA specification.',
			raw: 'hoge',
		},
	]);
});

test('[no-unknown-role-issue-4584-001] the message is in Japanese with locale ja', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="foo"></div>', undefined, false, 'ja');

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 12,
			message: 'WAI-ARIAの仕様において、ロール「foo」は存在しません。',
			raw: 'foo',
		},
	]);
});
