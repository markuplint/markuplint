import specs from '@markuplint/html-spec';
import { createTestElement } from '@markuplint/ml-core';
import { parser as svelteParser } from '@markuplint/svelte-parser';
import { describe, test, expect } from 'vitest';

import { representTransparentNodes, transparentMode } from './represent-transparent-nodes.js';

function c(html: string, evaluateConditionalChildNodes = true) {
	const el = createTestElement(`<div>${html}</div>`);
	const patterns = representTransparentNodes(
		[...el.children],
		[],
		specs,
		{
			ignoreHasMutableChildren: true,
			evaluateConditionalChildNodes,
		},
		'pretended',
	);
	return patterns.map(({ nodes }) => nodes.map(n => n.nodeName.toLowerCase() + (transparentMode.has(n) ? '*' : '')));
}

function svelteC(html: string) {
	const el = createTestElement(`<div>${html}</div>`, { parser: svelteParser });
	const patterns = representTransparentNodes(
		[...el.children],
		[],
		specs,
		{
			ignoreHasMutableChildren: true,
			evaluateConditionalChildNodes: true,
		},
		'pretended',
	);
	return patterns.map(({ nodes }) => nodes.map(n => n.nodeName.toLowerCase() + (transparentMode.has(n) ? '*' : '')));
}

test('[permitted-contents-invalid-001] <div>', () => {
	expect(c('<div></div>')).toStrictEqual([['div']]);
});

test('[permitted-contents-invalid-002] <audio>', () => {
	expect(c('<audio></audio>')).toStrictEqual([[]]);
	expect(c('<audio><span></span></audio>')).toStrictEqual([['span*']]);
	expect(c('<audio><source></source><span></span></audio>')).toStrictEqual([['span*']]);
	expect(c('<audio><source></source><track></track><span></span></audio>')).toStrictEqual([['span*']]);
});

describe('non-conditional mode', () => {
	test('[permitted-contents-invalid-003] <a> with multiple children produces single pattern', () => {
		const result = c('<a><span></span><em></em></a>', false);
		expect(result).toStrictEqual([['span*', 'em*']]);
	});

	test('[permitted-contents-invalid-004] multiple sibling <a> elements produce single pattern', () => {
		const result = c('<a><span></span></a><a><em></em></a>', false);
		expect(result).toStrictEqual([['span*', 'em*']]);
	});

	test('[permitted-contents-invalid-005] 12 sibling <a> elements with 2 children each produce single pattern', () => {
		const tags = Array.from({ length: 12 }, (_, i) => '<a><span></span><em></em></a>').join('');
		const result = c(tags, false);
		expect(result).toHaveLength(1);
		// Each <a> contributes 2 children (span* + em*) = 24 total
		expect(result[0]).toHaveLength(24);
	});
});

describe('MAX_PATTERNS cap', () => {
	test('[permitted-contents-issue-3895-001] 10 conditional siblings stay below the cap (exact cross-product)', () => {
		// Each <a> has 2 branches ({#if} taken / not taken) → 2^10 = 1024 patterns
		const tags = Array.from({ length: 10 }, () => '<a href>{#if x}<span>s</span>{/if}</a>').join('');
		const result = svelteC(tags);
		expect(result).toHaveLength(1024);
		// First pattern: every branch taken
		expect(result[0]).toStrictEqual(Array.from({ length: 10 }, () => 'span*'));
		// Last pattern: no branch taken — branch distinction is preserved
		expect(result.at(-1)).toStrictEqual([]);
	});

	test('[permitted-contents-issue-3895-002] 11th conditional sibling exceeds the cap and merges branches', () => {
		// 1024 patterns x 2 branches > MAX_PATTERNS (1024): the 11th sibling's
		// branches are merged into every existing pattern instead of doubling
		// them (documented over-approximation; false negatives are possible)
		const tags = Array.from({ length: 11 }, () => '<a href>{#if x}<span>s</span>{/if}</a>').join('');
		const result = svelteC(tags);
		expect(result).toHaveLength(1024);
		expect(result[0]).toStrictEqual(Array.from({ length: 11 }, () => 'span*'));
		// Even the all-branches-empty pattern receives the merged children —
		// the cap loses the branch distinction for the 11th sibling
		expect(result.at(-1)).toStrictEqual(['span*']);
	});
});
