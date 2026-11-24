import type { MLElement } from '../node/element.js';
import type { MLParser } from '@markuplint/ml-ast';
import type { Pretender } from '@markuplint/ml-config';

import { describe, test, expect } from 'vitest';

import { createTestDocument } from '../../test/index.js';

import {
	getPretenderDeclaredElements,
	isPretenderDeclaredElement,
	withPretenderDeclaredElements,
} from './declared-elements.js';

// The elements that a pretender declares are in no `nodeList`, and a lookup of the tree reads them
// through these.

async function jsxParser(): Promise<MLParser> {
	return (await import('@markuplint/jsx-parser')).parser;
}

function must<T>(value: T | null | undefined): T {
	expect(value).not.toBeNull();
	expect(value).not.toBeUndefined();
	return value as T;
}

const idOf = (id: string | { readonly dynamic: true }) => [{ name: 'id', value: id }];

const heading = (contents: NonNullable<Extract<Pretender['as'], object>['contents']>): Pretender => ({
	selector: 'Heading',
	as: { element: 'section', contents },
});

async function jsx(code: string, pretenders: readonly Pretender[]) {
	return createTestDocument(code, { parser: await jsxParser(), pretenders });
}

function tags(elements: readonly MLElement<any, any>[]) {
	return elements.map(el => el.localName);
}

describe('getPretenderDeclaredElements', () => {
	test('splits what the component renders at the children given at the usage site', async () => {
		const doc = await jsx('<Heading>Q</Heading>', [
			heading([{ element: 'i' }, { slot: true }, { element: 'b' }, { element: 'u' }]),
		]);
		const declared = must(getPretenderDeclaredElements(must(doc.querySelector('Heading'))));
		expect(tags(declared.before)).toStrictEqual(['i']);
		expect(tags(declared.after)).toStrictEqual(['b', 'u']);
	});

	test('puts every entry before the children when there is no slot entry', async () => {
		const doc = await jsx('<Heading>Q</Heading>', [heading([{ element: 'i' }, { element: 'b' }])]);
		const declared = must(getPretenderDeclaredElements(must(doc.querySelector('Heading'))));
		expect(tags(declared.before)).toStrictEqual(['i', 'b']);
		expect(declared.after).toStrictEqual([]);
	});

	test('has the wrapper of a single slot before its entries', async () => {
		const doc = await jsx('<Heading>Q</Heading>', [
			{
				selector: 'Heading',
				as: {
					element: 'div',
					slots: [{ element: 'p', contents: [{ element: 'i' }, { slot: true }, { element: 'b' }] }],
				},
			},
		]);
		const declared = must(getPretenderDeclaredElements(must(doc.querySelector('Heading'))));
		expect(tags(declared.before)).toStrictEqual(['p', 'i']);
		expect(tags(declared.after)).toStrictEqual(['b']);
	});

	test('has every wrapper and entry of several slots before the children', async () => {
		const doc = await jsx('<Heading>Q</Heading>', [
			{
				selector: 'Heading',
				as: {
					element: 'div',
					slots: [
						{ element: 'p', contents: [{ element: 'i' }, { slot: true }] },
						{ element: 'section', contents: [{ element: 'b' }] },
					],
				},
			},
		]);
		const declared = must(getPretenderDeclaredElements(must(doc.querySelector('Heading'))));
		expect(tags(declared.before)).toStrictEqual(['p', 'i', 'section', 'b']);
		expect(declared.after).toStrictEqual([]);
	});

	test('is null for an element that is not a pretender, or declares nothing', async () => {
		const doc = await jsx('<><div /><Plain /><Heading /></>', [
			{ selector: 'Plain', as: 'span' },
			heading([{ slot: true }]),
		]);
		expect(getPretenderDeclaredElements(must(doc.querySelector('div')))).toBeNull();
		expect(getPretenderDeclaredElements(must(doc.querySelector('Plain')))).toBeNull();
		expect(getPretenderDeclaredElements(must(doc.querySelector('Heading')))).toBeNull();
	});

	test('is null for a host that a declarative shadow root is attached to: it is rendered in their place', () => {
		const doc = createTestDocument('<x-btn><template shadowrootmode="open"></template></x-btn>', {
			pretenders: [
				{ selector: 'x-btn', as: { element: 'div', inheritAttrs: true, contents: [{ element: 'h2' }] } },
			],
		});
		expect(getPretenderDeclaredElements(must(doc.querySelector('x-btn')))).toBeNull();
	});
});

describe('isPretenderDeclaredElement', () => {
	test('is true for a declared element, and false for the pretender element, the element it stands for and any other', async () => {
		const doc = await jsx('<><Heading><p /></Heading></>', [heading([{ element: 'h2' }, { slot: true }])]);
		const host = must(doc.querySelector('Heading'));
		const context = host.pretenderContext as Extract<typeof host.pretenderContext, { type: 'pretender' }>;
		expect(context.type).toBe('pretender');
		const declared = must(getPretenderDeclaredElements(host)).before;
		expect(declared.map(el => isPretenderDeclaredElement(el))).toStrictEqual([true]);
		expect(isPretenderDeclaredElement(host)).toBe(false);
		expect(isPretenderDeclaredElement(must(doc.querySelector('p')))).toBe(false);
		expect(isPretenderDeclaredElement(context.as)).toBe(false);
	});

	test('is true for a slot wrapper and for an element in it', async () => {
		const doc = await jsx('<><Heading /></>', [
			{
				selector: 'Heading',
				as: { element: 'section', slots: [{ element: 'p', contents: [{ element: 'i' }, { slot: true }] }] },
			},
		]);
		const declared = must(getPretenderDeclaredElements(must(doc.querySelector('Heading')))).before;
		expect(tags(declared)).toStrictEqual(['p', 'i']);
		expect(declared.map(el => isPretenderDeclaredElement(el))).toStrictEqual([true, true]);
	});
});

describe('withPretenderDeclaredElements', () => {
	test('puts what comes before the children right after the pretender, and what comes after them after its last descendant', async () => {
		const doc = await jsx('<><Heading><p><em /></p></Heading><s /></>', [
			heading([{ element: 'i' }, { slot: true }, { element: 'b' }]),
		]);
		const elements = doc.querySelectorAll('*');
		expect(tags(withPretenderDeclaredElements(elements))).toStrictEqual(['section', 'i', 'p', 'em', 'b', 's']);
	});

	test('closes the pretenders from the innermost one', async () => {
		const doc = await jsx('<Heading><Sub><p /></Sub></Heading>', [
			heading([{ slot: true }, { element: 'b' }]),
			{ selector: 'Sub', as: { element: 'article', contents: [{ slot: true }, { element: 'u' }] } },
		]);
		const elements = doc.querySelectorAll('*');
		expect(tags(withPretenderDeclaredElements(elements))).toStrictEqual(['section', 'article', 'p', 'u', 'b']);
	});

	test('puts what comes after the children after the pretender when it has no descendant', async () => {
		const doc = await jsx('<><Heading /><s /></>', [heading([{ slot: true }, { element: 'b' }])]);
		const elements = doc.querySelectorAll('*');
		expect(tags(withPretenderDeclaredElements(elements))).toStrictEqual(['section', 'b', 's']);
	});

	test('reads a pretender in the content of a template, and the one after it', async () => {
		const doc = await jsx('<><template><Heading><p /></Heading></template><Heading /></>', [
			heading([{ slot: true }, { element: 'b' }]),
		]);
		const elements = doc.deepQuerySelectorAll('*');
		expect(tags(withPretenderDeclaredElements(elements))).toStrictEqual([
			'template',
			'section',
			'p',
			'b',
			'section',
			'b',
		]);
	});
});

describe('PretenderSlotContent#declared', () => {
	test('has the entries before the children given when the component renders no children (`slots: null`)', async () => {
		const doc = await jsx('<><Heading /></>', [
			{
				selector: 'Heading',
				as: { element: 'section', slots: null, contents: [{ element: 'i' }, { element: 'b' }] },
			},
		]);
		const declared = must(getPretenderDeclaredElements(must(doc.querySelector('Heading'))));
		expect(tags(declared.before)).toStrictEqual(['i', 'b']);
		expect(declared.after).toStrictEqual([]);
	});

	test('has no wrapper of its own when the wrapper is the pretender element (`slots: true`)', async () => {
		const doc = await jsx('<><Heading /></>', [
			{
				selector: 'Heading',
				as: { element: 'section', slots: true, contents: [{ element: 'i' }, { slot: true }, { element: 'b' }] },
			},
		]);
		const declared = must(getPretenderDeclaredElements(must(doc.querySelector('Heading'))));
		expect(tags(declared.before)).toStrictEqual(['i']);
		expect(tags(declared.after)).toStrictEqual(['b']);
	});
});

describe('MLParentNode#getElementById', () => {
	test('is the declared element when the component renders it before the children given', async () => {
		const doc = await jsx('<Heading><p id="t" /></Heading>', [
			heading([{ element: 'h2', attrs: idOf('t') }, { slot: true }]),
		]);
		const el = must(doc.getElementById('t'));
		expect(el.localName).toBe('h2');
		expect(isPretenderDeclaredElement(el)).toBe(true);
	});

	test('is the child given when the component renders the declared element after it', async () => {
		const doc = await jsx('<Heading><p id="t" /></Heading>', [
			heading([{ slot: true }, { element: 'h2', attrs: idOf('t') }]),
		]);
		expect(must(doc.getElementById('t')).localName).toBe('p');
	});

	test('is the declared element of the first of several slots, ahead of a child given with the same id', async () => {
		const doc = await jsx('<Heading><p id="t" /></Heading>', [
			{
				selector: 'Heading',
				as: {
					element: 'section',
					slots: [
						{ element: 'i', attrs: idOf('t') },
						{ element: 'b', attrs: idOf('t') },
					],
				},
			},
		]);
		const el = must(doc.getElementById('t'));
		expect(el.localName).toBe('i');
		expect(isPretenderDeclaredElement(el)).toBe(true);
	});

	test('does not have an id that is not known until it is rendered', async () => {
		const doc = await jsx('<Heading />', [heading([{ element: 'h2', attrs: idOf({ dynamic: true }) }])]);
		expect(doc.getElementById('t')).toBeNull();
		expect(doc.getElementById('')).toBeNull();
	});

	test('is in the tree of the pretended element: the content of a template is a tree of its own', async () => {
		const doc = await jsx('<><template><Heading /></template><p /></>', [
			heading([{ element: 'h2', attrs: idOf('t') }]),
		]);
		const host = must(doc.deepQuerySelectorAll('Heading')[0]);
		const declared = must(getPretenderDeclaredElements(host)).before[0];
		// A node is compared by identity: asserting on one that differs makes the matcher call `isEqualNode`
		expect(must(declared).getRootNode() === host.getRootNode()).toBe(true);
		expect(must(declared).getRootNode() === doc).toBe(false);
		expect(doc.getElementById('t')).toBeNull();
	});

	test('is in the tree of the pretended element for an element in a slot wrapper as well', async () => {
		const doc = await jsx('<><template><Heading /></template><p /></>', [
			{
				selector: 'Heading',
				as: { element: 'section', slots: [{ element: 'p', contents: [{ element: 'i', attrs: idOf('t') }] }] },
			},
		]);
		const host = must(doc.deepQuerySelectorAll('Heading')[0]);
		const declared = must(getPretenderDeclaredElements(host)).before;
		expect(tags(declared)).toStrictEqual(['p', 'i']);
		for (const el of declared) {
			expect(el.getRootNode() === host.getRootNode()).toBe(true);
			expect(el.getRootNode() === doc).toBe(false);
		}
		expect(doc.getElementById('t')).toBeNull();
	});
});

describe('MLElement#treeMayHoldUnknownId', () => {
	test('is true for a tree that has a declared element whose id is not known', async () => {
		const doc = await jsx('<><Heading /><div /></>', [
			heading([{ element: 'h2', attrs: idOf({ dynamic: true }) }]),
		]);
		expect(must(doc.querySelector('div')).treeMayHoldUnknownId()).toBe(true);
	});

	test('is false for a tree whose declared elements have ids that are known', async () => {
		const doc = await jsx('<><Heading /><div /></>', [heading([{ element: 'h2', attrs: idOf('t') }])]);
		expect(must(doc.querySelector('div')).treeMayHoldUnknownId()).toBe(false);
	});

	test('is true when the usage site forwards a spread to a declared element that inherits the attributes', async () => {
		const doc = await jsx('<><Heading {...props} /><div /></>', [
			{
				selector: 'Heading',
				as: { element: 'div', slots: [{ element: 'section', inheritAttrs: true }] },
			},
		]);
		expect(must(doc.querySelector('div')).treeMayHoldUnknownId()).toBe(true);
	});

	test('is true for a tree that has a declared element that comes after the children given and whose id is not known', async () => {
		const doc = await jsx('<><Heading /><div /></>', [
			heading([{ slot: true }, { element: 'h2', attrs: idOf({ dynamic: true }) }]),
		]);
		expect(must(doc.querySelector('div')).treeMayHoldUnknownId()).toBe(true);
	});

	test('is true for a tree that has a declared element whose name is a component that no pretender resolved', async () => {
		const doc = await jsx('<><Heading /><div /></>', [heading([{ element: 'Icon' }])]);
		expect(must(doc.querySelector('div')).treeMayHoldUnknownId()).toBe(true);
	});

	test('is true for a declared element of any of several slots whose id is not known', async () => {
		const doc = await jsx('<><Heading /><div /></>', [
			{
				selector: 'Heading',
				as: {
					element: 'section',
					slots: [
						{ element: 'p', contents: [{ slot: true }] },
						{ element: 'i', attrs: idOf({ dynamic: true }) },
					],
				},
			},
		]);
		expect(must(doc.querySelector('div')).treeMayHoldUnknownId()).toBe(true);
	});
});
