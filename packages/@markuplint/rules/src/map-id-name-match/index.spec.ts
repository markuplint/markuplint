import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[map-id-name-match-valid-001] map without id', async () => {
	const { violations } = await mlRuleTest(rule, '<map name="foo"><area href="a.html" alt="A"></map>');
	expect(violations.length).toBe(0);
});

test('[map-id-name-match-valid-002] map without name', async () => {
	const { violations } = await mlRuleTest(rule, '<map id="foo"><area href="a.html" alt="A"></map>');
	expect(violations.length).toBe(0);
});

test('[map-id-name-match-valid-003] id and name match', async () => {
	const { violations } = await mlRuleTest(rule, '<map id="foo" name="foo"><area href="a.html" alt="A"></map>');
	expect(violations.length).toBe(0);
});

test('[map-id-name-match-invalid-001] id and name mismatch', async () => {
	const { violations } = await mlRuleTest(rule, '<map id="foo" name="bar"><area href="a.html" alt="A"></map>');
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe(
		'The "id" attribute on a "map" element must have the same value as the "name" attribute',
	);
	expect(violations[0]?.raw).toBe('foo');
});
