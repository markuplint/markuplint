import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

describe('verify', () => {
	test('[itemprop-requires-itemscope-valid-001] itemprop inside an itemscope ancestor', async () => {
		const { violations } = await mlRuleTest(rule, '<div itemscope><span itemprop="name">x</span></div>');
		expect(violations).toStrictEqual([]);
	});

	test('[itemprop-requires-itemscope-valid-002] itemprop reachable via itemref', async () => {
		// HTML LS does not require the referenced element to be a descendant
		// of the itemscope element. Sibling reachability is sufficient.
		const { violations } = await mlRuleTest(
			rule,
			'<div itemscope itemref="ref-name"></div><span id="ref-name" itemprop="name">y</span>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[itemprop-requires-itemscope-valid-003] element with both itemscope and itemprop is valid (self-as-scope)', async () => {
		// HTML LS allows an element to be both an item host and contribute a
		// property to an enclosing item. closest('[itemscope]') must include
		// self so the inner element is not flagged as an orphan.
		const { violations } = await mlRuleTest(rule, '<div itemscope><div itemscope itemprop="address">x</div></div>');
		expect(violations).toStrictEqual([]);
	});

	test('[itemprop-requires-itemscope-valid-004] whitespace-only itemref contributes no entries; would-be target stays orphan', async () => {
		// `itemref="  "` yields zero non-empty tokens, so the host claims no
		// id at all. Exercises the `if (token)` filter inside the token-
		// collection loop. The standalone span is therefore not reachable
		// via itemref and falls into the orphan branch.
		const { violations } = await mlRuleTest(
			rule,
			'<div itemscope itemref="  "></div><span id="ref-name" itemprop="name">y</span>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 35,
				message:
					'The element must belong to an item via an ancestor `itemscope` or be referenced by an `itemref`',
				raw: '<span id="ref-name" itemprop="name">',
			},
		]);
	});

	test('[itemprop-requires-itemscope-invalid-001] orphan itemprop with no ancestor itemscope and no itemref', async () => {
		const { violations } = await mlRuleTest(rule, '<span itemprop="name">orphan</span>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message:
					'The element must belong to an item via an ancestor `itemscope` or be referenced by an `itemref`',
				raw: '<span itemprop="name">',
			},
		]);
	});

	test('[itemprop-requires-itemscope-invalid-002] itemref token does not match the orphan element id', async () => {
		// `itemref` lists `ref-other` but the orphan span has `id="ref-name"`,
		// so the orphan is NOT reachable via itemref.
		const { violations } = await mlRuleTest(
			rule,
			'<div itemscope itemref="ref-other"></div><span id="ref-name" itemprop="name">orphan</span>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 42,
				message:
					'The element must belong to an item via an ancestor `itemscope` or be referenced by an `itemref`',
				raw: '<span id="ref-name" itemprop="name">',
			},
		]);
	});

	test('[itemprop-requires-itemscope-invalid-003] each orphan in a sequence fires independently', async () => {
		// Loop must process every [itemprop] match, not stop at the first.
		// Pin both violations so a future change that accidentally narrows
		// the loop (or fires for the wrong reason) is caught.
		const { violations } = await mlRuleTest(rule, '<span itemprop="name">a</span><span itemprop="email">b</span>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message:
					'The element must belong to an item via an ancestor `itemscope` or be referenced by an `itemref`',
				raw: '<span itemprop="name">',
			},
			{
				severity: 'error',
				line: 1,
				col: 31,
				message:
					'The element must belong to an item via an ancestor `itemscope` or be referenced by an `itemref`',
				raw: '<span itemprop="email">',
			},
		]);
	});

	test('[itemprop-requires-itemscope-invalid-004] explicit empty id falls into the orphan branch', async () => {
		// `id=""` is not a valid identifier and cannot be an itemref target;
		// the rule must treat such an element the same as having no id at all.
		const { violations } = await mlRuleTest(rule, '<span id="" itemprop="name">orphan</span>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message:
					'The element must belong to an item via an ancestor `itemscope` or be referenced by an `itemref`',
				raw: '<span id="" itemprop="name">',
			},
		]);
	});
});

describe('trees', () => {
	test('[itemprop-requires-itemscope-issue-4489-001] an itemprop in the content of a template is checked in its tree', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div itemscope><template><span itemprop="name">x</span></template></div>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 26,
				message:
					'The element must belong to an item via an ancestor `itemscope` or be referenced by an `itemref`',
				raw: '<span itemprop="name">',
			},
		]);
	});

	test('[itemprop-requires-itemscope-issue-4489-002] an itemscope in the same template makes the item', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><div itemscope><span itemprop="name">x</span></div></template>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[itemprop-requires-itemscope-issue-4489-003] an itemref does not reach an element of another tree', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div itemscope itemref="n"></div><template><span id="n" itemprop="name">x</span></template>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 44,
				message:
					'The element must belong to an item via an ancestor `itemscope` or be referenced by an `itemref`',
				raw: '<span id="n" itemprop="name">',
			},
		]);
	});

	test('[itemprop-requires-itemscope-issue-4489-004] an itemref reaches an element of the same template', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><div itemscope itemref="n"></div><span id="n" itemprop="name">x</span></template>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[itemprop-requires-itemscope-issue-4489-006] an itemref that is not known until it is rendered may reach the element', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div itemscope itemref="{{x}}"></div><span id="foo" itemprop="name">x</span>',
			{ parser: { '.*': '@markuplint/mustache-parser' } },
		);
		expect(violations).toStrictEqual([]);
	});

	test('[itemprop-requires-itemscope-issue-4489-007] an itemref that is not known does not reach into another tree', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div itemscope itemref="{{x}}"></div><template><span id="foo" itemprop="name">x</span></template>',
			{ parser: { '.*': '@markuplint/mustache-parser' } },
		);
		expect(violations.map(violation => violation.raw)).toStrictEqual(['<span id="foo" itemprop="name">']);
	});

	test('[itemprop-requires-itemscope-issue-4489-005] an itemref reaches an id with the character references resolved', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div itemscope itemref="&#110;"></div><span id="n" itemprop="name">x</span>',
		);
		expect(violations).toStrictEqual([]);
	});
});

test('[itemprop-requires-itemscope-issue-4584-001] the message is in Japanese with locale ja', async () => {
	const { violations } = await mlRuleTest(rule, '<div itemprop="a"></div>', undefined, false, 'ja');

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: '要素は祖先の`itemscope`を介してアイテムに属するか、`itemref`から参照される必要があります',
			raw: '<div itemprop="a">',
		},
	]);
});
