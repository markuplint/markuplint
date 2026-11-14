import { describe, expect, test } from 'vitest';

import { createJSDOMElement as c } from './index.js';

describe('getComputedStyle of createJSDOMElement', () => {
	test('resolves a nested node of the detached tree', () => {
		const hidden = c('<div><p>a</p><b style="display: none">b</b></div>', 'b');
		expect(getComputedStyle(hidden).display).toBe('none');
		const shown = c('<div><p>a</p><div style="display: none"><span>b</span></div></div>', 'span');
		expect(getComputedStyle(shown).display).toBe('inline');
	});

	test('resolves a style inherited from an ancestor', () => {
		const el = c('<div><p>a</p><div style="visibility: hidden"><span>b</span></div></div>', 'span');
		expect(getComputedStyle(el).visibility).toBe('hidden');
	});

	test('resolves a rule of a stylesheet in the tree', () => {
		const el = c('<div><style>.x { display: none }</style><p>a</p><b class="x">b</b></div>', 'b');
		expect(getComputedStyle(el).display).toBe('none');
	});

	test('resolves the node of a connected document', () => {
		const html = c('<html><body><p style="display: none">a</p></body></html>');
		expect(getComputedStyle(html.querySelector('p')!).display).toBe('none');
	});

	test('reflects a change made between two calls', () => {
		const el = c('<div><p>a</p><b>b</b></div>', 'b');
		expect(getComputedStyle(el).display).toBe('inline');
		el.setAttribute('style', 'display: none');
		expect(getComputedStyle(el).display).toBe('none');
	});

	test('keeps the node detached from the document', () => {
		const el = c('<div><b style="display: none">b</b></div>', 'b');
		getComputedStyle(el);
		expect(el.isConnected).toBe(false);
		expect(el.parentElement?.tagName).toBe('DIV');
	});

	test('falls back to the plain behavior for a node of a shadow tree', () => {
		const host = c('<div></div>');
		const shadow = host.attachShadow({ mode: 'open' });
		shadow.innerHTML = '<b style="display: none">b</b>';
		expect(() => getComputedStyle(shadow.querySelector('b')!)).not.toThrow();
		expect(globalThis.window.document.body.children).toHaveLength(0);
	});

	test('keeps one copy of the tree for many calls', () => {
		const items = Array.from({ length: 300 }, (_, i) => `<li style="display: none">${i}</li>`).join('');
		const list = c(`<ul>${items}</ul>`);
		for (const li of list.querySelectorAll('li')) {
			expect(getComputedStyle(li).display).toBe('none');
		}
		expect(globalThis.window.document.body.children).toHaveLength(1);
	});

	test('resolves a node of an earlier document in that document', () => {
		const earlier = c('<div><b style="display: none">b</b></div>', 'b');
		c('<p></p>');
		expect(getComputedStyle(earlier).display).toBe('none');
		expect(earlier.ownerDocument.body.children).toHaveLength(1);
		expect(globalThis.window.document.body.children).toHaveLength(0);
	});

	test('rebuilds the copy after a node is added', () => {
		const list = c('<ul><li>a</li></ul>');
		const first = list.querySelector('li')!;
		expect(getComputedStyle(first).display).toBe('list-item');
		list.append(c('<li style="display: none">b</li>'));
		expect(getComputedStyle(list.querySelectorAll('li')[1]!).display).toBe('none');
	});
});
