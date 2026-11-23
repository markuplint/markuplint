import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[map-id-name-match-001] map without id', async () => {
	const { violations } = await mlRuleTest(rule, '<map name="foo"><area href="a.html" alt="A"></map>');
	expect(violations.length).toBe(0);
});

test('[map-id-name-match-002] map without name', async () => {
	const { violations } = await mlRuleTest(rule, '<map id="foo"><area href="a.html" alt="A"></map>');
	expect(violations.length).toBe(0);
});

test('[map-id-name-match-003] id and name match', async () => {
	const { violations } = await mlRuleTest(rule, '<map id="foo" name="foo"><area href="a.html" alt="A"></map>');
	expect(violations.length).toBe(0);
});

test('[map-id-name-match-004] id and name mismatch', async () => {
	const { violations } = await mlRuleTest(rule, '<map id="foo" name="bar"><area href="a.html" alt="A"></map>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 10,
			message: 'The "id" attribute on a "map" element must have the same value as the "name" attribute',
			raw: 'foo',
		},
	]);
});

test('[map-id-name-match-005] case-sensitive comparison', async () => {
	// HTML LS `<map>` requires the id and name attributes to be string-equal; the comparison
	// is case-sensitive even though the name attribute itself is matched case-insensitively
	// against `<img usemap>`. Pinning here so a future relaxation surfaces explicitly.
	const { violations } = await mlRuleTest(rule, '<map id="Foo" name="foo"><area href="a.html" alt="A"></map>');
	expect(violations.length).toBe(1);
	expect(violations[0]?.raw).toBe('Foo');
});

test('[map-id-name-match-006] the names of the attributes are shown as written (`name` is also a keyword) with locale ja', async () => {
	const { violations } = await mlRuleTest(rule, '<map id="a" name="b"></map>', undefined, false, 'ja');

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 10,
			message: '「map」要素の「id」属性は、「name」属性と同じ値であるべきです',
			raw: 'a',
		},
	]);
});
