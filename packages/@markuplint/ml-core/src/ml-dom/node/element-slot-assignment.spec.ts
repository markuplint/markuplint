import type { MLElement } from './element.js';
import type { MLParser } from '@markuplint/ml-ast';

import { HtmlParser } from '@markuplint/html-parser';
import { describe, test, expect } from 'vitest';

import { createTestDocument } from '../../test/index.js';

/**
 * Which light DOM nodes a `slot` of a declarative shadow root places: the named slot assignment of
 * the DOM, which assigns a slottable (an element or a text node that is a child of the host) to the
 * first slot of the shadow root whose `name` is the `slot` attribute of the slottable.
 *
 * @see https://dom.spec.whatwg.org/#find-slotables
 * @see https://dom.spec.whatwg.org/#find-a-slot
 */

function must<T>(value: T | null | undefined): T {
	expect(value).not.toBeNull();
	expect(value).not.toBeUndefined();
	return value as T;
}

function describeNode(node: { readonly nodeName: string; readonly textContent?: string | null }) {
	return node.nodeName === '#text' ? `#text(${node.textContent})` : node.nodeName.toLowerCase();
}

function slots(code: string, parser?: MLParser) {
	const doc = createTestDocument(code, parser ? { parser } : undefined);
	return doc.deepQuerySelectorAll('slot') as readonly MLElement<any, any>[];
}

async function jsxParser(): Promise<MLParser> {
	return (await import('@markuplint/jsx-parser')).parser;
}

async function pugParser(): Promise<MLParser> {
	return (await import('@markuplint/pug-parser')).parser;
}

class FrameworkSlotParser extends HtmlParser {
	override get slotElement() {
		return 'framework' as const;
	}
}

function frameworkSlotParser(): MLParser {
	return new FrameworkSlotParser();
}

describe('MLElement#getAssignedNodes', () => {
	test('the default slot takes the elements and the text that have no slot attribute', () => {
		const [slot] = slots('<div><template shadowrootmode="open"><slot></slot></template><p>a</p>b</div>');
		expect(must(must(slot).getAssignedNodes()).map(n => describeNode(n))).toStrictEqual(['p', '#text(b)']);
	});

	test('a named slot takes the elements whose slot attribute is its name', () => {
		const [first, second] = slots(
			'<div><template shadowrootmode="open"><slot name="a"></slot><slot></slot></template><p slot="a">x</p><i>y</i></div>',
		);
		expect(must(must(first).getAssignedNodes()).map(n => describeNode(n))).toStrictEqual(['p']);
		expect(must(must(second).getAssignedNodes()).map(n => describeNode(n))).toStrictEqual(['i']);
	});

	test('the first slot of the same name takes the nodes and the next one takes none', () => {
		const [first, second] = slots(
			'<div><template shadowrootmode="open"><slot></slot><slot></slot></template><p>a</p></div>',
		);
		expect(must(must(first).getAssignedNodes()).map(n => describeNode(n))).toStrictEqual(['p']);
		expect(must(second).getAssignedNodes()).toStrictEqual([]);
	});

	test('a node that names no slot of the shadow root is assigned to none', () => {
		const [slot] = slots(
			'<div><template shadowrootmode="open"><slot name="a"></slot></template><p slot="b">x</p></div>',
		);
		expect(must(slot).getAssignedNodes()).toStrictEqual([]);
	});

	test('a slot with no light child has no assigned nodes', () => {
		const [slot] = slots('<div><template shadowrootmode="open"><slot>fallback</slot></template></div>');
		expect(must(slot).getAssignedNodes()).toStrictEqual([]);
	});

	test('the template that declares the shadow root is not assigned', () => {
		const [slot] = slots('<div><template shadowrootmode="open"><slot></slot></template></div>');
		expect(must(slot).getAssignedNodes()).toStrictEqual([]);
	});

	test('a slot that is not in a shadow root has unknown assigned nodes', () => {
		const [slot] = slots('<div><slot></slot></div>');
		expect(must(slot).getAssignedNodes()).toBeNull();
	});

	test('a slot in the content of an ordinary template has unknown assigned nodes', () => {
		const [slot] = slots('<template><slot></slot></template>');
		expect(must(slot).getAssignedNodes()).toBeNull();
	});

	test('a slot of a nested shadow root takes the light children of its own host', () => {
		const found = slots(
			'<div><template shadowrootmode="open"><p><template shadowrootmode="open"><slot name="in"></slot></template><b slot="in">i</b></p><slot></slot></template><u>o</u></div>',
		);
		const inner = found.find(slot => slot.getAttribute('name') === 'in');
		const outer = found.find(slot => !slot.hasAttribute('name'));
		expect(must(must(outer).getAssignedNodes()).map(n => describeNode(n))).toStrictEqual(['u']);
		expect(must(must(inner).getAssignedNodes()).map(n => describeNode(n))).toStrictEqual(['b']);
	});

	test('a slot attribute that is empty is the default slot, as a missing one is', () => {
		const [slot] = slots('<div><template shadowrootmode="open"><slot></slot></template><p slot="">a</p></div>');
		expect(must(must(slot).getAssignedNodes()).map(n => describeNode(n))).toStrictEqual(['p']);
	});

	test('the text between the slottables is assigned in tree order', () => {
		const [slot] = slots('<div><template shadowrootmode="open"><slot></slot></template>a<p>b</p>c</div>');
		expect(must(must(slot).getAssignedNodes()).map(n => describeNode(n))).toStrictEqual([
			'#text(a)',
			'p',
			'#text(c)',
		]);
	});

	test('a second template that asks for a shadow root is an ordinary element that the default slot takes', () => {
		const [slot] = slots(
			'<div><template shadowrootmode="open"><slot></slot></template><template shadowrootmode="open"><b></b></template></div>',
		);
		expect(must(must(slot).getAssignedNodes()).map(n => describeNode(n))).toStrictEqual(['template']);
	});

	test('a spread attribute of a light child may set the slot attribute, so the assignment is unknown', async () => {
		const [slot] = slots(
			'<div><template shadowrootmode="open"><slot></slot></template><p {...props}>a</p></div>',
			await jsxParser(),
		);
		expect(must(slot).getAssignedNodes()).toBeNull();
	});

	test('a spread attribute of a slot may set the name, so the assignment is unknown', async () => {
		const [slot] = slots(
			'<div><template shadowrootmode="open"><slot {...props}></slot></template><p>a</p></div>',
			await jsxParser(),
		);
		expect(must(slot).getAssignedNodes()).toBeNull();
	});

	test('manual slot assignment is not known', () => {
		const [slot] = slots(
			'<div><template shadowrootmode="open" shadowrootslotassignment="manual"><slot></slot></template><p>a</p></div>',
		);
		expect(must(slot).getAssignedNodes()).toBeNull();
	});

	test('a closed shadow root assigns too', () => {
		const [slot] = slots('<div><template shadowrootmode="closed"><slot></slot></template><p>a</p></div>');
		expect(must(must(slot).getAssignedNodes()).map(n => describeNode(n))).toStrictEqual(['p']);
	});

	test('the slot element of a framework is not an HTML slot', () => {
		const [slot] = slots(
			'<div><template shadowrootmode="open"><slot></slot></template><p>a</p></div>',
			frameworkSlotParser(),
		);
		expect(must(slot).getAssignedNodes()).toBeNull();
	});

	test('a dynamic slot attribute of a light child leaves the assignment unknown', async () => {
		const [slot] = slots(
			'<div><template shadowrootmode="open"><slot></slot></template><p slot={name}>a</p></div>',
			await jsxParser(),
		);
		expect(must(slot).getAssignedNodes()).toBeNull();
	});

	test('a dynamic name of a slot leaves the assignment unknown', async () => {
		const [slot] = slots(
			'<div><template shadowrootmode="open"><slot name={name}></slot></template><p>a</p></div>',
			await jsxParser(),
		);
		expect(must(slot).getAssignedNodes()).toBeNull();
	});

	test('the nodes in a fragment are candidates', async () => {
		const [slot] = slots(
			'<div><template shadowrootmode="open"><slot></slot></template><><p>a</p><i>b</i></></div>',
			await jsxParser(),
		);
		expect(must(must(slot).getAssignedNodes()).map(n => describeNode(n))).toStrictEqual(['p', 'i']);
	});

	test('a block that has no behavior leaves the assignment unknown', async () => {
		const [slot] = slots(
			['div', '  template(shadowrootmode="open")', '    slot', '  if a', '    p a'].join('\n'),
			await pugParser(),
		);
		expect(must(slot).getAssignedNodes()).toBeNull();
	});

	test('the nodes of a loop block are candidates', async () => {
		const [slot] = slots(
			'<div><template shadowrootmode="open"><slot></slot></template>{items.map(item => <p>{item}</p>)}</div>',
			await jsxParser(),
		);
		expect(must(must(slot).getAssignedNodes()).map(n => describeNode(n))).toStrictEqual(['p']);
	});

	test('a component that no pretender resolved may render any slottable', async () => {
		const [slot] = slots(
			'<div><template shadowrootmode="open"><slot></slot></template><Item /></div>',
			await jsxParser(),
		);
		expect(must(slot).getAssignedNodes()).toBeNull();
	});

	test('a slot in a block of the shadow root leaves the assignment unknown', async () => {
		const [slot] = slots(
			'<div><template shadowrootmode="open">{items.map(() => <slot />)}</template><p>a</p></div>',
			await jsxParser(),
		);
		expect(must(slot).getAssignedNodes()).toBeNull();
	});
});

describe('MLElement#assignedNodes', () => {
	test('throws for an element that is not a slot', () => {
		const doc = createTestDocument('<div></div>');
		expect(() => must(doc.querySelector('div')).assignedNodes()).toThrow(TypeError);
	});

	test('flatten returns the fallback children of a slot that takes none', () => {
		const [slot] = slots('<div><template shadowrootmode="open"><slot name="x">fb</slot></template></div>');
		expect(must(slot).assignedNodes()).toStrictEqual([]);
		expect(
			must(slot)
				.assignedNodes({ flatten: true })
				.map(n => describeNode(n)),
		).toStrictEqual(['#text(fb)']);
	});

	test('flatten replaces an assigned slot with the nodes that it places', () => {
		const found = slots(
			'<div><template shadowrootmode="open"><div><template shadowrootmode="open"><slot id="inner"></slot></template><slot id="outer"></slot></div></template><p>a</p></div>',
		);
		const inner = found.find(slot => slot.id === 'inner');
		expect(
			must(inner)
				.assignedNodes()
				.map(n => describeNode(n)),
		).toStrictEqual(['slot']);
		expect(
			must(inner)
				.assignedNodes({ flatten: true })
				.map(n => describeNode(n)),
		).toStrictEqual(['p']);
	});

	test('returns the assigned nodes, and none when they are unknown', () => {
		const [known] = slots('<div><template shadowrootmode="open"><slot></slot></template><p>a</p></div>');
		expect(must(known).assignedNodes()).toHaveLength(1);
		const [unknown] = slots('<div><slot></slot></div>');
		expect(must(unknown).assignedNodes()).toStrictEqual([]);
	});
});

describe('MLElement#getFlatTreeSlot', () => {
	test('is the slot that places a light child', () => {
		const doc = createTestDocument(
			'<div><template shadowrootmode="open"><slot name="a"></slot></template><p slot="a">x</p></div>',
		);
		const p = must(doc.querySelector('p'));
		expect(p.getFlatTreeSlot()).toBe(must(doc.deepQuerySelectorAll('slot')[0]));
	});

	test('is null for a light child that no slot places', () => {
		const doc = createTestDocument(
			'<div><template shadowrootmode="open"><slot name="a"></slot></template><p>x</p></div>',
		);
		expect(must(doc.querySelector('p')).getFlatTreeSlot()).toBeNull();
	});

	test('is undefined for a node that is not a light child of a shadow host', () => {
		const doc = createTestDocument('<div><p>x</p></div>');
		expect(must(doc.querySelector('p')).getFlatTreeSlot()).toBeUndefined();
	});

	test('is undefined when the assignment is unknown', () => {
		const doc = createTestDocument(
			'<div><template shadowrootmode="open" shadowrootslotassignment="manual"><slot></slot></template><p>x</p></div>',
		);
		expect(must(doc.querySelector('p')).getFlatTreeSlot()).toBeUndefined();
	});

	test('is the slot for a light child in a loop block', async () => {
		const doc = createTestDocument(
			'<div><template shadowrootmode="open"><slot></slot></template>{items.map(item => <p>{item}</p>)}</div>',
			{ parser: await jsxParser() },
		);
		expect(must(doc.querySelector('p')).getFlatTreeSlot()?.localName).toBe('slot');
	});

	test('is the slot for a light child in a fragment', async () => {
		const doc = createTestDocument(
			'<div><template shadowrootmode="open"><slot></slot></template><><p>a</p></></div>',
			{ parser: await jsxParser() },
		);
		expect(must(doc.querySelector('p')).getFlatTreeSlot()?.localName).toBe('slot');
	});

	test('is undefined for an element in the shadow root', () => {
		const doc = createTestDocument('<div><template shadowrootmode="open"><p>x</p><slot></slot></template></div>');
		expect(must(doc.deepQuerySelectorAll('p')[0]).getFlatTreeSlot()).toBeUndefined();
	});
});

describe('assignedSlot', () => {
	test('an element and a text node have the slot of an open shadow root', () => {
		const doc = createTestDocument('<div><template shadowrootmode="open"><slot></slot></template><p>a</p>b</div>');
		const slot = must(doc.deepQuerySelectorAll('slot')[0]);
		expect(must(doc.querySelector('p')).assignedSlot).toBe(slot);
		const host = must(doc.querySelector('div'));
		const text = [...host.childNodes].find(n => n.is(n.TEXT_NODE));
		expect(must(text).assignedSlot).toBe(slot);
	});

	test('is null for a closed shadow root, which the DOM does not expose', () => {
		const doc = createTestDocument('<div><template shadowrootmode="closed"><slot></slot></template><p>a</p></div>');
		expect(must(doc.querySelector('p')).assignedSlot).toBeNull();
	});

	test('is null when no slot takes the node or the assignment is unknown', () => {
		const doc = createTestDocument(
			'<div><template shadowrootmode="open"><slot name="a"></slot></template><p>a</p></div>',
		);
		expect(must(doc.querySelector('p')).assignedSlot).toBeNull();
	});
});
