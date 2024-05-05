import htmlSpecs, { specs } from '@markuplint/html-spec';
import { createTestElement } from '@markuplint/ml-core';
import { getContentModel } from '@markuplint/ml-spec';
import { test, expect } from 'vitest';

import { start } from './start.js';

function c(html: string, selector = '') {
	const root = createTestElement(html, { specs: htmlSpecs });
	const el = selector ? root.querySelector(selector) : root;
	if (!el) throw new Error('Not found target element');
	return start(getContentModel(el, specs)!, el, htmlSpecs, {
		ignoreHasMutableChildren: true,
		evaluateConditionalChildNodes: true,
	});
}

test('transparent: <a>', () => {
	expect(c('<a href><button></button></a>')[0]?.type).toBe('MATCHED');
	expect(c('<a href><button></button></a>')[1]?.type).toBe('TRANSPARENT_MODEL_DISALLOWS');
	expect(c('<a href><b></b></a>')[0]?.type).toBe('MATCHED');
	expect(c('<a href>text</a>')[0]?.type).toBe('MATCHED');
	expect(c('<a href></a>')[0]?.type).toBe('MATCHED_ZERO');
	expect(c('<a><div></div><span></span><em></em></a>')[0]?.type).toBe('MATCHED');
});

test('transparent: <del> with <details>', () => {
	expect(c('<details><summary></summary><del></del></details>')[0]?.type).toBe('MATCHED');
	expect(c('<details><summary></summary><del>text</del></details>')[0]?.type).toBe('MATCHED');
	expect(c('<details><summary></summary><del><b></b><b></b><b></b></del></details>')[0]?.type).toBe('MATCHED');
	expect(c('<details><summary></summary><del><c></c></del></details>')[0]?.type).toBe('UNEXPECTED_EXTRA_NODE');
	expect(c('<details><summary></summary><del><c></c></del></details>')[0]?.scope.nodeName).toBe('C');
});

test('transparent: <a> with <details> (<a> perspective)', () => {
	expect(c('<details><summary></summary><a href></a></details>')[0]?.type).toBe('MATCHED');
	expect(c('<details><summary></summary><a href>text</a></details>')[0]?.type).toBe('MATCHED');
	expect(c('<details><summary></summary><a href><button></button></a></details>')[0]?.type).toBe('MATCHED');
	expect(c('<details><summary></summary><a href><button></button></a></details>')[1]?.type).toBe(
		'TRANSPARENT_MODEL_DISALLOWS',
	);
});

test('transparent: <a> with <div>', () => {
	expect(c('<div><a><option></option></a></div>')[0]?.type).toBe('UNEXPECTED_EXTRA_NODE');
});

test('transparent: <a> with <svg>', () => {
	expect(c('<svg><a><text>text</text></a></svg>')[0]?.type).toBe('MATCHED');
	expect(c('<svg><a><text>text</text></a></svg>', 'a')[0]?.type).toBe('MATCHED');
	expect(c('<svg><a><text>text</text></a></svg>', 'text')[0]?.type).toBe('MATCHED');
});

test('conditional transparent: <audio>', () => {
	expect(c('<audio src="path/to"><source /></audio>')[0]?.type).toBe('MATCHED');
	expect(c('<div><audio src="path/to"><source /></audio></div>', 'audio')[0]?.type).toBe('MATCHED');
	expect(c('<div><audio src="path/to"><source /></audio></div>')[0]?.type).toBe('UNEXPECTED_EXTRA_NODE');
});

test('transparent: <audio> with <audio>', () => {
	expect(c('<audio><audio></audio></audio>')[0]?.type).toBe('MATCHED_ZERO');
	expect(c('<audio><audio></audio></audio>')[1]?.type).toBe('TRANSPARENT_MODEL_DISALLOWS');
});

test('extra nodes', () => {
	expect(c('<ul>TEXT</ul>')[0]?.type).toBe('UNEXPECTED_EXTRA_NODE');
});

test(':has', () => {
	expect(c('<a><div><div><button></button></div></div></a>')[0]?.hint.not?.nodeName).toBeUndefined();
	expect(c('<a><div><div><button></button></div></div></a>')[1]?.hint.not?.nodeName).toBe('BUTTON');
});
