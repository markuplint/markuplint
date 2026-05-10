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
		const { violations } = await mlRuleTest(rule, '<span itemprop="name">a</span><span itemprop="email">b</span>');
		expect(violations).toHaveLength(2);
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
