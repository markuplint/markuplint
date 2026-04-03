import specs from '@markuplint/html-spec';
import { createTestElement } from '@markuplint/ml-core';
import { describe, test, expect } from 'vitest';

import { representTransparentNodes, transparentMode } from './represent-transparent-nodes.js';

function c(html: string, evaluateConditionalChildNodes = true) {
	const el = createTestElement(`<div>${html}</div>`);
	const patterns = representTransparentNodes([...el.children], specs, {
		ignoreHasMutableChildren: true,
		evaluateConditionalChildNodes,
	});
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
