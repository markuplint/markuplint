import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

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

describe('the ancestor is looked for in the tree of the element', () => {
	test('[require-ancestor-issue-4506-001] area in the content of a template under a map is not reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<map name="m"><template><area alt="x" href="#"></template></map>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4506-002] area in the content of a template is not reported without a map outside', async () => {
		const { violations } = await mlRuleTest(rule, '<div><template><area alt="x" href="#"></template></div>');
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4506-003] area under a map in the content of a template is valid', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><map name="m"><area alt="x" href="#"></map></template>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4506-004] area in the content of a template without a map in the content is not reported', async () => {
		const { violations } = await mlRuleTest(rule, '<template><div><area alt="x" href="#"></div></template>');
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4506-005] area in a declarative shadow root without a map in it is reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div><template shadowrootmode="open"><area alt="x" href="#"></template></div>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 38,
				message: 'The "area" element must appear as a descendant of the "map" element',
				raw: '<area alt="x" href="#">',
			},
		]);
	});

	test('[require-ancestor-issue-4506-006] area in a declarative shadow root under a map outside is reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<map name="m"><div><template shadowrootmode="open"><area alt="x" href="#"></template></div></map>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 52,
				message: 'The "area" element must appear as a descendant of the "map" element',
				raw: '<area alt="x" href="#">',
			},
		]);
	});

	test('[require-ancestor-issue-4506-007] area in a declarative shadow root with a map in it is valid', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div><template shadowrootmode="open"><map name="m"><area alt="x" href="#"></map></template></div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4506-008] area in a template that fails to attach a shadow root is not reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<ul><template shadowrootmode="open"><area alt="x" href="#"></template></ul>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4506-009] area in a template in a declarative shadow root is not reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div><template shadowrootmode="open"><template><area alt="x" href="#"></template></template></div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[require-ancestor-issue-4506-010] a template of a template engine is an ordinary element of the climb', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><div><template v-if="x"><area alt="x" href="#" /></template></div></template>',
			{ parser: { '.*': '@markuplint/vue-parser' }, specs: { '.*': '@markuplint/vue-spec' } },
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 35,
				message: 'The "area" element must appear as a descendant of the "map" element',
				raw: '<area alt="x" href="#" />',
			},
		]);
	});
});
