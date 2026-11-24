import { describe, test, expect } from 'vitest';

import { elementOf } from '../element-of.js';

import { hasElementOfUnknownId, isUnknownValueAttr } from '@markuplint/ml-spec';

async function jsx(html: string, selector?: string) {
	return elementOf(html, selector, { parser: (await import('@markuplint/jsx-parser')).parser });
}

describe('isUnknownValueAttr', () => {
	test('[has-unknown-id-001] is false for no attribute and for an attribute whose value is known', async () => {
		const el = await jsx('<div id="a"></div>');
		expect(isUnknownValueAttr(null)).toBe(false);
		expect(isUnknownValueAttr(el.getAttrNode('id'))).toBe(false);
	});

	test('[has-unknown-id-002] is true for a value that is not known', async () => {
		const el = await jsx('<div id={a}></div>');
		expect(isUnknownValueAttr(el.getAttrNode('id'))).toBe(true);
	});
});

describe('hasElementOfUnknownId', () => {
	test('[has-unknown-id-003] is false in a tree whose ids are all known', async () => {
		const el = await jsx('<div><h2 id="h"></h2><p></p></div>', 'p');
		expect(hasElementOfUnknownId(el)).toBe(false);
	});

	test('[has-unknown-id-004] is true for every element of the tree that has one, the one itself too', async () => {
		const div = await jsx('<div><h2 id={x}></h2><p></p></div>');
		const h2 = div.querySelector('h2')!;
		expect(hasElementOfUnknownId(div.querySelector('p')!)).toBe(true);
		expect(hasElementOfUnknownId(h2)).toBe(true);
		expect(hasElementOfUnknownId(div)).toBe(true);
	});

	test('[has-unknown-id-005] does not cross the boundary of the content of a template element', async () => {
		const div = await jsx('<div><template><h2 id={x}></h2><i></i></template><p></p></div>');

		// The tree of the content has it, and the tree that holds the `template` does not
		const content = div.querySelector('template')!.content!;
		expect(hasElementOfUnknownId(content.querySelector('i')!)).toBe(true);
		expect(hasElementOfUnknownId(div.querySelector('p')!)).toBe(false);
	});

	test('[has-unknown-id-006] is false for an element that is in no tree', async () => {
		// The `template` element that a declarative shadow root is attached to is in no tree
		const div = await jsx('<div><template shadowrootmode="open" id={x}></template></div>');
		const template = div.deepQuerySelectorAll('template')[0]!;
		expect(template.getRootNode()).toBe(template);
		expect(hasElementOfUnknownId(template)).toBe(false);
	});
});
