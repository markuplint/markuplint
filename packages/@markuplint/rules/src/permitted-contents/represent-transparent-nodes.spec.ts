import specs from '@markuplint/html-spec';
import { createTestElement } from '@markuplint/ml-core';
import { test, expect } from 'vitest';

import { representTransparentNodes, transparentMode } from './represent-transparent-nodes.js';

function c(html: string) {
	const el = createTestElement(`<div>${html}</div>`);
	const patterns = representTransparentNodes([...el.children], specs, {
		ignoreHasMutableChildren: true,
		evaluateConditionalChildNodes: true,
	});
	return patterns.map(({ nodes }) => nodes.map(n => n.nodeName.toLowerCase() + (transparentMode.has(n) ? '*' : '')));
}

test('<div>', () => {
	expect(c('<div></div>')).toStrictEqual([['div']]);
});

test('<audio>', () => {
	expect(c('<audio></audio>')).toStrictEqual([[]]);
	expect(c('<audio><span></span></audio>')).toStrictEqual([['span*']]);
	expect(c('<audio><source></source><span></span></audio>')).toStrictEqual([['span*']]);
	expect(c('<audio><source></source><track></track><span></span></audio>')).toStrictEqual([['span*']]);
});
