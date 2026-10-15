import { describe, test, expect } from 'vitest';

import { createTestDocument, createTestElement } from './test/index.js';

const jsx = async () => ({ parser: await import('@markuplint/jsx-parser') });

describe('#custom in :model()', () => {
	test.each(['flow', 'phrasing', 'palpable'])('an autonomous custom element matches :model(%s)', category => {
		const el = createTestElement('<x-foo></x-foo>');
		expect(el.matches(`:model(${category})`)).toBe(true);
	});

	test('the same categories keep selecting the HTML elements they list', () => {
		const doc = createTestDocument('<x-foo></x-foo><div></div><span></span>');
		const flow = Array.from(doc.querySelectorAll(':model(flow)'), el => el.localName);
		const phrasing = Array.from(doc.querySelectorAll(':model(phrasing)'), el => el.localName);
		const palpable = Array.from(doc.querySelectorAll(':model(palpable)'), el => el.localName);
		expect(flow).toStrictEqual(['x-foo', 'div', 'span']);
		expect(phrasing).toStrictEqual(['x-foo', 'span']);
		expect(palpable).toStrictEqual(['x-foo', 'div', 'span']);
	});

	test(':not(:model(flow)) does not select a custom element', () => {
		const doc = createTestDocument('<x-foo></x-foo><div></div><annotation-xml></annotation-xml>');
		const names = Array.from(doc.querySelectorAll(':not(:model(flow))'), el => el.localName);
		expect(names).toStrictEqual(['annotation-xml']);
	});

	test(':has(:model(phrasing)) sees a custom element as a descendant', () => {
		const doc = createTestDocument('<div><x-foo></x-foo></div><section></section>');
		const names = Array.from(doc.querySelectorAll(':has(:model(phrasing))'), el => el.localName);
		expect(names).toStrictEqual(['div']);
	});

	test('a category without a #custom entry does not match a custom element', () => {
		const el = createTestElement('<x-foo></x-foo>');
		expect(el.matches(':model(interactive)')).toBe(false);
	});

	test('a reserved hyphenated name is an HTML element, not a custom element', () => {
		const el = createTestElement('<annotation-xml></annotation-xml>');
		expect(el.isCustomElement).toBe(false);
	});

	test('a plain HTML element is not a custom element', () => {
		const el = createTestElement('<div></div>');
		expect(el.isCustomElement).toBe(false);
	});

	test('an authored component is a custom element', async () => {
		const el = createTestElement('<Foo />', await jsx());
		expect(el.isCustomElement).toBe(true);
	});

	test('a component pretending to be an HTML element is not a custom element', async () => {
		const el = createTestElement('<Button />', {
			...(await jsx()),
			pretenders: [{ selector: 'Button', as: 'button' }],
		});
		expect(el.isCustomElement).toBe(false);
	});

	test('a component pretending to be a custom element is a custom element', async () => {
		const el = createTestElement('<Button />', {
			...(await jsx()),
			pretenders: [{ selector: 'Button', as: 'x-button' }],
		});
		expect(el.isCustomElement).toBe(true);
	});
});
