import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-unknown-role-001] valid role', async () => {
	expect((await mlRuleTest(rule, '<div role="button"></div>')).violations).toStrictEqual([]);
});

test('[no-unknown-role-002] no role attr', async () => {
	expect((await mlRuleTest(rule, '<div></div>')).violations).toStrictEqual([]);
});

test('[no-unknown-role-003] non-existent role', async () => {
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

test('[no-unknown-role-004] the message is in Japanese with locale ja', async () => {
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

test('[no-unknown-role-005] of two `role` attributes, the one that the element has is checked', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	// In JSX, a later `role` that code sets overwrites the first, so the misspelled one is never the role
	expect((await mlRuleTest(rule, '<div role="buton" role={x} />', { parser })).violations).toStrictEqual([]);

	// In the HTML syntax, the first is kept and the second dropped
	expect((await mlRuleTest(rule, '<div role="buton" role="x"></div>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 12,
			message: 'The "buton" role does not exist according to the WAI-ARIA specification.',
			raw: 'buton',
		},
	]);
});

test('[no-unknown-role-006] Vue: of a static `role` and a bound `:role`, the first one written is the role', async () => {
	const vue = { parser: { '.*': '@markuplint/vue-parser' }, specs: { '.*': '@markuplint/vue-spec' } };
	expect(
		(await mlRuleTest(rule, '<template><div role="buton" :role="r"></div></template>', vue)).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 22,
			message: 'The "buton" role does not exist according to the WAI-ARIA specification.',
			raw: 'buton',
		},
	]);
	expect(
		(await mlRuleTest(rule, '<template><div :role="r" role="buton"></div></template>', vue)).violations,
	).toStrictEqual([]);
});

test('[no-unknown-role-007] a role is read with its character references decoded', async () => {
	expect((await mlRuleTest(rule, '<div role="&#98;utton">a</div>')).violations).toStrictEqual([]);
});

test('[no-unknown-role-008] a role is compared ASCII case-insensitively, as the computed role reads it', async () => {
	expect((await mlRuleTest(rule, '<div role="Button">a</div>')).violations).toStrictEqual([]);
});
