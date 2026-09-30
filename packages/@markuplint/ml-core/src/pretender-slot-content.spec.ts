// @ts-nocheck

import specs from '@markuplint/html-spec';
import { describe, test, expect } from 'vitest';

import { createTestElement } from './test/index.js';

const jsxOptions = async () => ({
	parser: await import('@markuplint/jsx-parser'),
	specs: { ...specs, acceptedAttrNames: 'idl' },
});

describe('pretenders: dynamic attribute values (issue-4054)', () => {
	test('{ dynamic: true } yields a dynamic attribute that keeps its name', async () => {
		const el = createTestElement('<Tab />', {
			...(await jsxOptions()),
			pretenders: [
				{
					selector: 'Tab',
					as: {
						element: 'button',
						attrs: [
							{ name: 'type', value: 'button' },
							{ name: 'tabIndex', value: { dynamic: true } },
						],
					},
				},
			],
		});

		const type = el.attributes.find(attr => attr.localName === 'type');
		expect(type?.value).toBe('button');
		expect(type?.isDynamicValue).toBeUndefined();

		const tabindex = el.attributes.find(attr => attr.localName === 'tabindex');
		expect(tabindex?.isDynamicValue).toBe(true);
	});

	test('an attribute without value stays a plain empty attribute', async () => {
		const el = createTestElement('<Tab />', {
			...(await jsxOptions()),
			pretenders: [{ selector: 'Tab', as: { element: 'button', attrs: [{ name: 'disabled' }] } }],
		});

		const disabled = el.attributes.find(attr => attr.localName === 'disabled');
		expect(disabled?.value).toBe('');
		expect(disabled?.isDynamicValue).toBeUndefined();
	});
});

describe('pretenders: slot content (issue-4054)', () => {
	test('contents without a slot entry: static elements first, then the given children', async () => {
		const el = createTestElement('<Pic><source /></Pic>', {
			...(await jsxOptions()),
			pretenders: [
				{
					selector: 'Pic',
					as: {
						element: 'picture',
						slots: null,
						contents: [{ element: 'img', attrs: [{ name: 'alt', value: 'x' }] }],
					},
				},
			],
		});

		expect(el.pretenderContext?.type).toBe('pretender');
		const { slotContent } = el.pretenderContext;
		expect(slotContent.wrapper.localName).toBe('picture');
		expect(slotContent.mutable).toBe(false);

		const filled = slotContent.fill([...el.childNodes]);
		expect(filled.map(node => node.localName)).toStrictEqual(['img', 'source']);
		expect(filled[0].getAttribute('alt')).toBe('x');
	});

	test('the slot entry decides where the given children are placed', async () => {
		const el = createTestElement('<Pic><source /></Pic>', {
			...(await jsxOptions()),
			pretenders: [
				{
					selector: 'Pic',
					as: { element: 'picture', slots: true, contents: [{ slot: true }, { element: 'img' }] },
				},
			],
		});

		const filled = el.pretenderContext.slotContent.fill([...el.childNodes]);
		expect(filled.map(node => node.localName)).toStrictEqual(['source', 'img']);
	});

	test('a dynamic entry marks the content mutable and adds no node', async () => {
		const el = createTestElement('<Box />', {
			...(await jsxOptions()),
			pretenders: [
				{
					selector: 'Box',
					as: { element: 'details', slots: true, contents: [{ dynamic: true }, { slot: true }] },
				},
			],
		});

		const { slotContent } = el.pretenderContext;
		expect(slotContent.mutable).toBe(true);
		expect(slotContent.fill([])).toStrictEqual([]);
	});

	test('a single slot wrapper is a virtual element whose parent is the component', async () => {
		const el = createTestElement('<Card>x</Card>', {
			...(await jsxOptions()),
			pretenders: [
				{
					selector: 'Card',
					as: {
						element: 'div',
						slots: [
							{ element: 'p', attrs: [{ name: 'class', value: 'body' }], contents: [{ slot: true }] },
						],
					},
				},
			],
		});

		const { slotContent } = el.pretenderContext;
		expect(el.localName).toBe('div');
		expect(slotContent.wrapper.localName).toBe('p');
		expect(slotContent.wrapper.getAttribute('class')).toBe('body');
		expect(slotContent.wrapper.parentElement).toBe(el);
	});

	test('several slot wrappers leave the wrapper unknown', async () => {
		const el = createTestElement('<Card />', {
			...(await jsxOptions()),
			pretenders: [
				{
					selector: 'Card',
					as: {
						element: 'div',
						slots: [
							{ element: 'p', contents: [{ slot: true }] },
							{ element: 'ul', contents: [{ slot: true }] },
						],
					},
				},
			],
		});

		expect(el.pretenderContext.slotContent.wrapper).toBeNull();
	});

	test.each([
		['a bare string', 'div'],
		['slots: true', { element: 'div', slots: true }],
		['slots: null', { element: 'img', slots: null }],
	])('%s pretender without contents has no slot content', async (_, as) => {
		const el = createTestElement('<Comp>x</Comp>', {
			...(await jsxOptions()),
			pretenders: [{ selector: 'Comp', as }],
		});
		expect(el.pretenderContext.slotContent).toBeUndefined();
	});
});

describe('pretenders: review follow-ups (issue-4054)', () => {
	test('svg, math and custom elements in contents keep their identity', async () => {
		const el = createTestElement('<Btn />', {
			...(await jsxOptions()),
			pretenders: [
				{
					selector: 'Btn',
					as: {
						element: 'button',
						slots: true,
						contents: [{ element: 'svg' }, { element: 'math' }, { element: 'my-icon' }, { slot: true }],
					},
				},
			],
		});

		const [svg, math, custom] = el.pretenderContext.slotContent.fill([]);
		expect(svg.namespaceURI).toBe('http://www.w3.org/2000/svg');
		expect(math.namespaceURI).toBe('http://www.w3.org/1998/Math/MathML');
		expect(custom.elementType).toBe('web-component');
	});

	test('a null attribute value from an unchecked JSON config is a plain attribute', async () => {
		const el = createTestElement('<Det />', {
			...(await jsxOptions()),
			pretenders: [{ selector: 'Det', as: { element: 'details', attrs: [{ name: 'open', value: null }] } }],
		});

		expect(el.attributes.find(attr => attr.localName === 'open')?.value).toBe('');
	});

	test('the given children are placed at the first slot position only', async () => {
		const el = createTestElement('<Fig><img /></Fig>', {
			...(await jsxOptions()),
			pretenders: [
				{
					selector: 'Fig',
					as: { element: 'figure', slots: true, contents: [{ slot: true }, { slot: true }] },
				},
			],
		});

		const filled = el.pretenderContext.slotContent.fill([...el.childNodes]);
		expect(filled).toHaveLength(1);
	});
});
