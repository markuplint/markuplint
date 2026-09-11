import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[require-ancestor-issue-3670-001] area outside map is invalid', async () => {
	const { violations } = await mlRuleTest(rule, '<div><area alt="x" href="#"></div>');
	expect(violations).toStrictEqual([
		expect.objectContaining({
			severity: 'error',
			message: 'The "area" element must appear as a descendant of the "map" element',
		}),
	]);
});

test('[require-ancestor-issue-3670-002] area inside map is valid', async () => {
	const { violations } = await mlRuleTest(rule, '<map name="m"><area alt="x" href="#"></map>');
	expect(violations).toStrictEqual([]);
});

test('[require-ancestor-issue-3670-003] area inside deeply nested map has no descendantOf violation', async () => {
	const { violations } = await mlRuleTest(rule, '<map name="m"><div><p><area alt="x" href="#"></p></div></map>');
	expect(violations).toStrictEqual([]);
});
