import type { MLParser } from '@markuplint/ml-ast';

import { describe, test, expect } from 'vitest';

import { createTestDocument } from '../../test/index.js';

async function parserOf(name: 'jsx' | 'vue' | 'astro'): Promise<MLParser> {
	switch (name) {
		case 'jsx': {
			return (await import('@markuplint/jsx-parser')).parser;
		}
		case 'vue': {
			return (await import('@markuplint/vue-parser')).parser;
		}
		case 'astro': {
			return (await import('@markuplint/astro-parser')).parser;
		}
	}
}

function element(document: ReturnType<typeof createTestDocument>, selector: string) {
	const el = document.querySelector(selector);
	if (!el) {
		throw new TypeError(`No element ${selector}`);
	}
	return el;
}

/**
 * The value of an attribute is the value that the DOM has: the tokenizer decodes the character references of an
 * attribute value written in the markup, as JSX decodes those of a string attribute by its own rules.
 */
describe('the value of an attribute written in the markup', () => {
	test.each([
		['&#116;rue', 'true'],
		['&#x20;', ' '],
		['a&amp;b', 'a&b'],
		['&notit', '&notit'],
		['&not;it', '¬it'],
		['&amp', '&'],
	])('is decoded in HTML: %j', (raw, value) => {
		const el = element(createTestDocument(`<div title="${raw}"></div>`), 'div');
		expect(el.getAttribute('title')).toBe(value);
		const attr = el.getAttributeNode('title');
		expect([attr?.value, attr?.nodeValue, attr?.textContent]).toStrictEqual([value, value, value]);
		expect(attr?.valueNode?.raw).toBe(raw);
	});

	test.each([
		['a&amp;b', 'a&b'],
		['&amp', '&amp'],
		['&apos;', "'"],
	])('is decoded by the rules of JSX in JSX: %j', async (raw, value) => {
		const document = createTestDocument(`<div title="${raw}" />`, { parser: await parserOf('jsx') });
		expect(element(document, 'div').getAttribute('title')).toBe(value);
	});

	test('is decoded by the rules of MDX in MDX', async () => {
		const parser = (await import('@markuplint/mdx-parser')).parser;
		const document = createTestDocument('<div title="&check; &amp" />', { parser });
		expect(element(document, 'div').getAttribute('title')).toBe('\u2713 &amp');
	});

	test('is not decoded on an Astro component or custom element, which gets it as written', async () => {
		const document = createTestDocument('<C label="a&amp;b" /><my-el title="a&amp;b"></my-el>', {
			parser: await parserOf('astro'),
		});
		expect(element(document, 'C').getAttribute('label')).toBe('a&amp;b');
		expect(element(document, 'my-el').getAttribute('title')).toBe('a&amp;b');
	});

	test('is decoded in a template of Vue and of Astro', async () => {
		const vue = createTestDocument('<template><div title="a&amp;b"></div></template>', {
			parser: await parserOf('vue'),
		});
		expect(element(vue, 'div').getAttribute('title')).toBe('a&b');
		const astro = createTestDocument('<div title="a&amp;b"></div>', { parser: await parserOf('astro') });
		expect(element(astro, 'div').getAttribute('title')).toBe('a&b');
	});

	test('a value that is code is not decoded', async () => {
		const document = createTestDocument('<div title={"a&amp;b"} />', { parser: await parserOf('jsx') });
		expect(element(document, 'div').getAttribute('title')).toBe('a&amp;b');
	});

	test('a part of the value is located where it is written', () => {
		const el = element(createTestDocument('<div class="&#97; b"></div>'), 'div');
		expect([...el.classList]).toStrictEqual(['a', 'b']);
		const attr = el.getAttributeNode('class');
		expect(attr?.locateInValue(0, 1)).toStrictEqual({ raw: '&#97;', startOffset: 12, startLine: 1, startCol: 13 });
		expect(attr?.locateInValue(2, 3)).toStrictEqual({ raw: 'b', startOffset: 18, startLine: 1, startCol: 19 });
	});

	test('a part of a value on a later line is located on that line', () => {
		const attr = element(createTestDocument('<div title="a\n&amp;b"></div>'), 'div').getAttributeNode('title');
		expect(attr?.value).toBe('a\n&b');
		expect(attr?.locateInValue(3, 4)).toStrictEqual({ raw: 'b', startOffset: 19, startLine: 2, startCol: 6 });
	});

	test('a value that is code is not located', async () => {
		const document = createTestDocument('<div title={"a"} />', { parser: await parserOf('jsx') });
		expect(element(document, 'div').getAttributeNode('title')?.locateInValue(0, 1)).toBeNull();
	});
});

/**
 * Of two attributes of one name, the element has one: the first in the HTML syntax, the last in a props object.
 * `classList` and the selectors read that one too.
 */
describe('of two attributes of one name', () => {
	test('`classList` holds the classes of the `class` that the element has', async () => {
		const html = element(createTestDocument('<div class="a" class="b"></div>'), 'div');
		expect([...html.classList]).toStrictEqual(['a']);
		expect(html.className).toBe('a');
		expect(html.matches('.b')).toBe(false);
		const jsx = createTestDocument('<div class="a" class="b" />', { parser: await parserOf('jsx') });
		expect([...element(jsx, 'div').classList]).toStrictEqual(['b']);
		const vue = createTestDocument('<template><div class="a" :class="b"></div></template>', {
			parser: await parserOf('vue'),
		});
		expect(element(vue, 'div').matches('.a')).toBe(true);
	});

	test('an attribute selector matches the attribute that the element has', async () => {
		const html = element(createTestDocument('<div role="a" role="b"></div>'), 'div');
		expect([html.matches('[role=a]'), html.matches('[role=b]')]).toStrictEqual([true, false]);
		const jsx = createTestDocument('<div role="a" role="b" />', { parser: await parserOf('jsx') });
		const el = element(jsx, 'div');
		expect([el.matches('[role=a]'), el.matches('[role=b]')]).toStrictEqual([false, true]);
	});

	test('Astro merges `class:list` with `class`, whichever comes first', async () => {
		const parser = await parserOf('astro');
		for (const code of ['<div class:list={[x]} class="a"></div>', '<div class="a" class:list={[x]}></div>']) {
			const el = element(createTestDocument(code, { parser }), 'div');
			expect(el.matches('.a')).toBe(true);
			expect([...el.attributes].map(attr => attr.overridden)).toStrictEqual([false, false]);
		}
	});

	test('a boolean on `class` of JSX is the string', async () => {
		const document = createTestDocument('<div class={false} />', { parser: await parserOf('jsx') });
		expect([...element(document, 'div').classList]).toStrictEqual(['false']);
	});

	test('an Astro component and a custom element get the last, an HTML element the first', async () => {
		const parser = await parserOf('astro');
		const document = createTestDocument(
			'<MyButton label="a" label="b" /><my-el label="a" label="b"></my-el><button title="a" title="b"></button>',
			{ parser },
		);
		const component = element(document, 'MyButton');
		expect([component.getAttribute('label'), component.getAttributePretended('label')]).toStrictEqual(['b', 'b']);
		expect(element(document, 'my-el').getAttribute('label')).toBe('b');
		expect(element(document, 'button').getAttribute('title')).toBe('a');
		const pretended = createTestDocument('<MyButton label="" label="b" />', {
			parser,
			pretenders: [{ selector: 'MyButton', as: { element: 'button', aria: { name: { fromAttr: 'label' } } } }],
		});
		expect(element(pretended, 'button').getAttributePretended('label')).toBe('b');
	});
});

describe('MLElement#isContentEditable', () => {
	test.each([
		['<div contenteditable><p>a</p></div>', 'p', true],
		['<div contenteditable="TRUE"><p>a</p></div>', 'p', true],
		['<div contenteditable="plaintext-only"><p>a</p></div>', 'p', true],
		['<div contenteditable="true"><p contenteditable="false">a</p></div>', 'p', false],
		['<div contenteditable="false"><p contenteditable="bogus">a</p></div>', 'p', false],
		['<div contenteditable="true"><p contenteditable="bogus">a</p></div>', 'p', true],
		['<div><p>a</p></div>', 'p', false],
		['<div contenteditable="true"><svg><g></g></svg></div>', 'g', true],
	])('of %s (%s) is %j', (code, selector, editable) => {
		expect(element(createTestDocument(code), selector).isContentEditable).toBe(editable);
	});

	test('does not reach the content of a template, which is a tree of its own', () => {
		const template = element(
			createTestDocument('<div contenteditable><template><p>a</p></template></div>'),
			'template',
		);
		const p = [...template.childNodes].find(node => node.is(node.ELEMENT_NODE));
		expect([template.isContentEditable, p?.is(p.ELEMENT_NODE) && p.isContentEditable]).toStrictEqual([true, false]);
	});

	test('is not known (false) where a spread may set contenteditable, or its value is code', async () => {
		const parser = await parserOf('jsx');
		const spread = createTestDocument('<div contenteditable="true"><p {...props}>a</p></div>', { parser });
		expect(element(spread, 'p').isContentEditable).toBe(false);
		const code = createTestDocument('<div contenteditable={editable}><p>a</p></div>', { parser });
		expect(element(code, 'p').isContentEditable).toBe(false);
	});
});
