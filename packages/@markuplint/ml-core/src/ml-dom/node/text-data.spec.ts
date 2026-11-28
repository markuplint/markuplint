import { describe, test, expect } from 'vitest';

import { createTestDocument } from '../../test/index.js';

/**
 * The data of a text node is what the tokenizer makes of the source: a character reference is decoded in the
 * data and RCDATA states, and not in the content of the elements that the tokenizer reads as RAWTEXT, script data
 * or PLAINTEXT.
 *
 * @see https://html.spec.whatwg.org/multipage/parsing.html#character-reference-state
 */
describe('MLText#data', () => {
	function textIn(code: string, selector: string) {
		const text = createTestDocument(code).querySelector(selector)?.childNodes[0];
		if (!text?.is(text.TEXT_NODE)) {
			throw new Error(`The first child of ${selector} is not a text node`);
		}
		return text;
	}

	test.each([
		['&#32;', ' '],
		['&nbsp;', ' '],
		['&lt;b&gt;', '<b>'],
		['a &amp; b', 'a & b'],
		['&#x1F600;', '\u{1F600}'],
		['no reference', 'no reference'],
	])('of %j in a div is %j', (source, data) => {
		const text = textIn(`<div>${source}</div>`, 'div');
		expect(text.data).toBe(data);
		expect(text.textContent).toBe(data);
		expect(text.nodeValue).toBe(data);
		expect(text.raw).toBe(source);
	});

	test.each([
		['<title>&lt;t&gt;</title>', 'title', '<t>'],
		['<textarea>&amp;</textarea>', 'textarea', '&'],
	])('of RCDATA is decoded: %j', (code, selector, data) => {
		expect(textIn(code, selector).data).toBe(data);
	});

	// `script`, `style` and `xmp` have no text node here: `@markuplint/html-parser` reads their content as raw text
	test.each([
		['<iframe>&lt;</iframe>', 'iframe'],
		['<noembed>&lt;</noembed>', 'noembed'],
		['<noframes>&lt;</noframes>', 'noframes'],
		['<plaintext>&lt;', 'plaintext'],
	])('of an element that the tokenizer reads without a character reference is the source: %j', (code, selector) => {
		expect(textIn(code, selector).data).toBe('&lt;');
	});

	test('of a CDATA section of foreign content is its characters as written, without its delimiters', () => {
		expect(textIn('<svg><![CDATA[ &#65; ]]></svg>', 'svg').data).toBe(' &#65; ');
	});

	test.each([
		['<svg><![CDATA[x]]>y<![CDATA[z]]></svg>', 'xyz'],
		['<svg>a&amp;<![CDATA[&amp;]]></svg>', 'a&&amp;'],
		['<svg><![CDATA[a]]>&lt;</svg>', 'a<'],
	])('of foreign content with CDATA sections and text between them: %s', (code, data) => {
		expect(textIn(code, 'svg').data).toBe(data);
	});

	test('the content of the `script` and `style` of SVG is not raw text', () => {
		expect(textIn('<svg><style>a</style></svg>', 'style').isRawTextElementContent()).toBe(false);
		expect(textIn('<svg><script>a</script></svg>', 'script').isRawTextElementContent()).toBe(false);
	});

	test('of an element of that name in another namespace is decoded', () => {
		expect(textIn('<svg><iframe>&lt;</iframe></svg>', 'iframe').data).toBe('<');
	});

	test('of an HTML element in a MathML text integration point is read as in HTML', () => {
		expect(textIn('<math><mi><iframe>&lt;</iframe></mi></math>', 'iframe').data).toBe('&lt;');
		expect(textIn('<svg><desc><iframe>&lt;</iframe></desc></svg>', 'iframe').data).toBe('&lt;');
	});

	test('of the SVG `style` is decoded, as its content is markup there', () => {
		expect(textIn('<svg><style>a &lt; b</style></svg>', 'style').data).toBe('a < b');
	});

	test('of JSX is decoded by the rules of JSX: the XHTML set, with a semicolon', async () => {
		const jsxParser = await import('@markuplint/jsx-parser');
		const text = createTestDocument('<div>a&amp;b &NotEqualTilde; &amp x&#32;</div>', {
			parser: jsxParser,
		}).querySelector('div')?.childNodes[0];
		expect(text?.textContent).toBe('a&b &NotEqualTilde; &amp x ');
	});

	test.each([
		['@markuplint/vue-parser', '<template><iframe>&lt;</iframe><p>a&amp;b</p></template>'],
		['@markuplint/svelte-parser', '<iframe>&lt;</iframe><p>a&amp;b</p>'],
	])('of %s is what its template parser reads', async (parserName, source) => {
		const parser = await import(parserName);
		const document = createTestDocument(source, { parser });
		const textOf = (selector: string) => document.querySelector(selector)?.childNodes[0]?.textContent;
		expect(textOf('p')).toBe('a&b');
		// The compilers of Vue and Svelte decode in `iframe`, where the tokenizer of HTML does not
		expect(textOf('iframe')).toBe('<');
	});

	test.each(['noscript', 'noembed', 'noframes', 'xmp'])(
		'of Vue is decoded in %s, which the compiler does not read as raw text',
		async name => {
			const parser = await import('@markuplint/vue-parser');
			const document = createTestDocument(`<template><${name}>&lt;</${name}></template>`, { parser });
			expect(document.querySelector(name)?.childNodes[0]?.textContent).toBe('<');
		},
	);

	test.each([
		['@markuplint/markdown-parser', 'a &amp; b', 'p', 'a & b'],
		['@markuplint/markdown-parser', 'a \\&amp; b', 'p', 'a &amp; b'],
		['@markuplint/markdown-parser', 'a `&amp;` b', 'code', '&amp;'],
		['@markuplint/markdown-parser', '```\n&lt;\n```', 'code', '&lt;\n'],
		['@markuplint/mdx-parser', 'a &amp; b', 'p', 'a & b'],
		['@markuplint/mdx-parser', 'a \\&amp; b', 'p', 'a &amp; b'],
	])(
		'of %s is decoded in a paragraph, keeps a backslash escape, and is as written in code: %j',
		async (parserName, source, selector, data) => {
			const parser = await import(parserName);
			const el = createTestDocument(source, { parser }).querySelector(selector);
			const text = [...(el?.childNodes ?? [])].find(node => node.is(node.TEXT_NODE));
			expect(text?.textContent).toBe(data);
		},
	);

	test('of an element is the decoded data of its text nodes', () => {
		const div = createTestDocument('<div>&lt;<b>&amp;</b></div>').querySelector('div');
		expect(div?.textContent).toBe('<&');
	});
});
