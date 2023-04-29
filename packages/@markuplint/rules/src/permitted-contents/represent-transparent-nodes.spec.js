// @ts-nocheck

import specs from '@markuplint/html-spec';
import { createTestElement } from '@markuplint/ml-core';

import { representTransparentNodes, transparentMode } from './represent-transparent-nodes';

function c(html: string) {
	const el = createTestElement(`<div>${html}</div>`);
	const { nodes } = representTransparentNodes(Array.from(el.children), specs, { ignoreHasMutableChildren: true });
	return nodes.map(n => n.nodeName.toLowerCase() + (transparentMode.has(n) ? '*' : ''));
}

it('<div>', () => {
	expect(c('<div></div>')).toStrictEqual(['div']);
});

it('<audio>', () => {
	expect(c('<audio></audio>')).toStrictEqual([]);
	expect(c('<audio><span></span></audio>')).toStrictEqual(['span*']);
	expect(c('<audio><source></source><span></span></audio>')).toStrictEqual(['span*']);
	expect(c('<audio><source></source><track></track><span></span></audio>')).toStrictEqual(['span*']);
});
