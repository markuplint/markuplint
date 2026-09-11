import { describe, test, expect } from 'vitest';

import { nodeListToDebugMaps } from '@markuplint/parser-utils';

import { parser } from './parser.js';
import { getLineAndColumn } from './markdown-aware-parser.js';

function parse(code: string) {
	return parser.parse(code);
}

describe('MarkdownParser', () => {
	describe('Markdown elements', () => {
		test('heading', () => {
			const doc = parse('# Heading');
			const maps = nodeListToDebugMaps(doc.nodeList);
			expect(maps).toStrictEqual(['[1:1]>[1:10](0,9)h1: #\u2423Heading', '[1:3]>[1:10](2,9)#text: Heading']);
		});

		test('heading depth', () => {
			const doc = parse('### Heading 3');
			const maps = nodeListToDebugMaps(doc.nodeList);
			expect(maps).toStrictEqual([
				'[1:1]>[1:14](0,13)h3: ###\u2423Heading\u24233',
				'[1:5]>[1:14](4,13)#text: Heading\u24233',
			]);
		});

		test('heading h6 (max depth)', () => {
			const doc = parse('###### Heading 6');
			const maps = nodeListToDebugMaps(doc.nodeList);
			expect(maps).toStrictEqual([
				'[1:1]>[1:17](0,16)h6: ######\u2423Heading\u24236',
				'[1:8]>[1:17](7,16)#text: Heading\u24236',
			]);
		});

		test('paragraph', () => {
			const doc = parse('Some paragraph text.');
			const maps = nodeListToDebugMaps(doc.nodeList);
			expect(maps).toStrictEqual([
				'[1:1]>[1:21](0,20)p: Some\u2423paragraph\u2423text.',
				'[1:1]>[1:21](0,20)#text: Some\u2423paragraph\u2423text.',
			]);
		});

		test('emphasis', () => {
			const doc = parse('*emphasized*');
			const maps = nodeListToDebugMaps(doc.nodeList);
			expect(maps).toStrictEqual([
				'[1:1]>[1:13](0,12)p: *emphasized*',
				'[1:1]>[1:13](0,12)em: *emphasized*',
				'[1:2]>[1:12](1,11)#text: emphasized',
			]);
		});

		test('strong', () => {
			const doc = parse('**bold**');
			const maps = nodeListToDebugMaps(doc.nodeList);
			expect(maps).toStrictEqual([
				'[1:1]>[1:9](0,8)p: **bold**',
				'[1:1]>[1:9](0,8)strong: **bold**',
				'[1:3]>[1:7](2,6)#text: bold',
			]);
		});

		test('link', () => {
			const doc = parse('[link text](https://example.com)');
			const startTag = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'a');
			expect(startTag).toBeDefined();
			const href = startTag!.attributes.find(a => a.type === 'attr' && a.name.raw === 'href');
			expect(href).toBeDefined();
			expect(href!.value.raw).toBe('https://example.com');
		});

		test('link with title', () => {
			const doc = parse('[link](https://example.com "title text")');
			const startTag = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'a');
			expect(startTag).toBeDefined();
			const title = startTag!.attributes.find(a => a.type === 'attr' && a.name.raw === 'title');
			expect(title).toBeDefined();
			expect(title!.value.raw).toBe('title text');
		});

		test('link without title does NOT have title attribute', () => {
			const doc = parse('[link](https://example.com)');
			const startTag = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'a');
			expect(startTag).toBeDefined();
			const title = startTag!.attributes.find(a => a.type === 'attr' && a.name.raw === 'title');
			expect(title).toBeUndefined();
		});

		test('image', () => {
			const doc = parse('![alt text](image.png)');
			const startTag = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'img');
			expect(startTag).toBeDefined();
			const src = startTag!.attributes.find(a => a.type === 'attr' && a.name.raw === 'src');
			expect(src).toBeDefined();
			expect(src!.value.raw).toBe('image.png');
			const alt = startTag!.attributes.find(a => a.type === 'attr' && a.name.raw === 'alt');
			expect(alt).toBeDefined();
			expect(alt!.value.raw).toBe('alt text');
		});

		test('image with empty alt', () => {
			const doc = parse('![](image.png)');
			const startTag = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'img');
			expect(startTag).toBeDefined();
			const alt = startTag!.attributes.find(a => a.type === 'attr' && a.name.raw === 'alt');
			expect(alt).toBeDefined();
			expect(alt!.value.raw).toBe('');
		});

		test('image without title does NOT have title attribute', () => {
			const doc = parse('![alt](image.png)');
			const startTag = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'img');
			expect(startTag).toBeDefined();
			const title = startTag!.attributes.find(a => a.type === 'attr' && a.name.raw === 'title');
			expect(title).toBeUndefined();
			// Verify exactly 2 attributes: src and alt
			expect(startTag!.attributes.length).toBe(2);
		});

		test('image with title has title attribute', () => {
			const doc = parse('![alt](image.png "my title")');
			const startTag = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'img');
			expect(startTag).toBeDefined();
			const title = startTag!.attributes.find(a => a.type === 'attr' && a.name.raw === 'title');
			expect(title).toBeDefined();
			expect(title!.value.raw).toBe('my title');
			// Verify exactly 3 attributes: src, alt, title
			expect(startTag!.attributes.length).toBe(3);
		});

		test('unordered list', () => {
			const doc = parse('- item 1\n- item 2\n');
			const ul = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'ul');
			expect(ul).toBeDefined();
			const lis = doc.nodeList.filter(n => n?.type === 'starttag' && n.nodeName === 'li');
			expect(lis.length).toBe(2);
		});

		test('ordered list', () => {
			const doc = parse('1. item 1\n2. item 2\n');
			const ol = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'ol');
			expect(ol).toBeDefined();
		});

		test('ordered list with custom start', () => {
			const doc = parse('5. item 5\n6. item 6\n');
			const ol = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'ol');
			expect(ol).toBeDefined();
			const start = ol!.attributes.find(a => a.type === 'attr' && a.name.raw === 'start');
			expect(start).toBeDefined();
			expect(start!.value.raw).toBe('5');
		});

		test('ordered list starting at 1 does NOT have start attribute', () => {
			const doc = parse('1. first\n2. second\n');
			const ol = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'ol');
			expect(ol).toBeDefined();
			const start = ol!.attributes.find(a => a.type === 'attr' && a.name.raw === 'start');
			expect(start).toBeUndefined();
		});

		test('blockquote', () => {
			const doc = parse('> quoted text');
			const maps = nodeListToDebugMaps(doc.nodeList);
			expect(maps).toStrictEqual([
				'[1:1]>[1:14](0,13)blockquote: >␣quoted␣text',
				'[1:3]>[1:14](2,13)p: quoted␣text',
				'[1:3]>[1:14](2,13)#text: quoted␣text',
			]);
		});

		test('thematic break', () => {
			const doc = parse('---\n');
			const maps = nodeListToDebugMaps(doc.nodeList);
			expect(maps).toStrictEqual(['[1:1]>[1:4](0,3)hr: ---']);
		});

		test('inline code', () => {
			const doc = parse('`code here`');
			const code = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'code');
			expect(code).toBeDefined();
			expect(code!.childNodes.length).toBe(1);
			expect(code!.childNodes[0].type).toBe('text');
			expect(code!.childNodes[0].raw).toBe('code here');
		});

		test('inline code with double backticks', () => {
			// remark parses `` code `` as inlineCode with value "code"
			// The remaining " here ``" is a separate text node
			const doc = parse('`` code `` here ``');
			const code = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'code');
			expect(code).toBeDefined();
			expect(code!.childNodes.length).toBe(1);
			expect(code!.childNodes[0].raw).toBe('code');
		});

		test('code block becomes pre>code elements', () => {
			const doc = parse('```html\n<div>not parsed</div>\n```\n');
			const pre = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'pre');
			expect(pre).toBeDefined();
			const code = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'code');
			expect(code).toBeDefined();
			const langAttr = code!.attributes.find(a => a.type === 'attr' && a.name.raw === 'class');
			expect(langAttr).toBeDefined();
			expect(langAttr!.value.raw).toBe('language-html');
		});

		test('code block without language', () => {
			const doc = parse('```\nsome code\n```\n');
			const pre = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'pre');
			expect(pre).toBeDefined();
			const code = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'code');
			expect(code).toBeDefined();
			expect(code!.attributes.length).toBe(0);
		});

		test('code block text content is preserved', () => {
			const doc = parse('```js\nconst x = 1;\n```\n');
			const code = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'code');
			expect(code).toBeDefined();
			expect(code!.childNodes.length).toBe(1);
			expect(code!.childNodes[0].type).toBe('text');
			expect(code!.childNodes[0].raw).toBe('const x = 1;');
		});

		test('code block with empty content has no text child', () => {
			const doc = parse('```\n```\n');
			const code = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'code');
			expect(code).toBeDefined();
			expect(code!.childNodes.length).toBe(0);
		});

		test('hard line break (two trailing spaces) becomes <br>', () => {
			const doc = parse('line one  \nline two\n');
			const br = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'br');
			expect(br).toBeDefined();
		});

		test('nested markdown: bold link', () => {
			const doc = parse('**[bold link](url)**');
			const strong = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'strong');
			expect(strong).toBeDefined();
			const link = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'a');
			expect(link).toBeDefined();
			const href = link!.attributes.find(a => a.type === 'attr' && a.name.raw === 'href');
			expect(href!.value.raw).toBe('url');
		});
	});

	describe('Link and image references', () => {
		test('linkReference resolves to <a> element', () => {
			const doc = parse('[link text][ref]\n\n[ref]: https://example.com "Example"\n');
			const a = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'a');
			expect(a).toBeDefined();
			const href = a!.attributes.find(attr => attr.type === 'attr' && attr.name.raw === 'href');
			expect(href).toBeDefined();
			expect(href!.value.raw).toBe('https://example.com');
			const title = a!.attributes.find(attr => attr.type === 'attr' && attr.name.raw === 'title');
			expect(title).toBeDefined();
			expect(title!.value.raw).toBe('Example');
		});

		test('imageReference resolves to <img> element', () => {
			const doc = parse('![alt text][img]\n\n[img]: image.png "Title"\n');
			const img = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'img');
			expect(img).toBeDefined();
			const src = img!.attributes.find(attr => attr.type === 'attr' && attr.name.raw === 'src');
			expect(src).toBeDefined();
			expect(src!.value.raw).toBe('image.png');
			const alt = img!.attributes.find(attr => attr.type === 'attr' && attr.name.raw === 'alt');
			expect(alt).toBeDefined();
			expect(alt!.value.raw).toBe('alt text');
		});

		test('unresolved linkReference is treated as plain text by remark', () => {
			// remark-parse does not produce linkReference nodes when definition is missing;
			// it treats the syntax as literal text in a paragraph.
			const doc = parse('[text][missing]\n');
			const p = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'p');
			expect(p).toBeDefined();
			const text = doc.nodeList.find(n => n?.type === 'text');
			expect(text).toBeDefined();
			expect(text!.raw).toContain('[text][missing]');
		});

		test('unresolved imageReference is treated as plain text by remark', () => {
			const doc = parse('![alt][missing]\n');
			const p = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'p');
			expect(p).toBeDefined();
			const text = doc.nodeList.find(n => n?.type === 'text');
			expect(text).toBeDefined();
			expect(text!.raw).toContain('![alt][missing]');
		});

		test('shortcut linkReference [ref] resolves using identifier as label', () => {
			const doc = parse('[example]\n\n[example]: https://example.com\n');
			const a = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'a');
			expect(a).toBeDefined();
			const href = a!.attributes.find(attr => attr.type === 'attr' && attr.name.raw === 'href');
			expect(href).toBeDefined();
			expect(href!.value.raw).toBe('https://example.com');
		});

		test('linkReference title from definition is passed to <a>', () => {
			const doc = parse('[link text][ref]\n\n[ref]: https://example.com "Example"\n');
			const a = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'a');
			expect(a).toBeDefined();
			expect(a!.attributes.length).toBe(2);
			const title = a!.attributes.find(attr => attr.type === 'attr' && attr.name.raw === 'title');
			expect(title).toBeDefined();
			expect(title!.value.raw).toBe('Example');
		});

		test('linkReference without title in definition does NOT have title attribute', () => {
			const doc = parse('[link text][ref]\n\n[ref]: https://example.com\n');
			const a = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'a');
			expect(a).toBeDefined();
			const title = a!.attributes.find(attr => attr.type === 'attr' && attr.name.raw === 'title');
			expect(title).toBeUndefined();
			// Only href attribute
			expect(a!.attributes.length).toBe(1);
		});
	});

	describe('GFM extensions', () => {
		test('GFM table becomes table>tr>th/td elements', () => {
			const doc = parse('| A | B |\n| - | - |\n| 1 | 2 |\n');
			const table = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'table');
			expect(table).toBeDefined();
			const ths = doc.nodeList.filter(n => n?.type === 'starttag' && n.nodeName === 'th');
			expect(ths.length).toBe(2);
			const tds = doc.nodeList.filter(n => n?.type === 'starttag' && n.nodeName === 'td');
			expect(tds.length).toBe(2);
		});

		test('GFM table header cells contain correct text', () => {
			const doc = parse('| Name | Age |\n| - | - |\n| Alice | 30 |\n');
			const ths = doc.nodeList.filter(n => n?.type === 'starttag' && n.nodeName === 'th');
			expect(ths.length).toBe(2);
			// Verify text content of header cells
			const thTexts = ths.map(th => th.childNodes.find(c => c.type === 'text')?.raw);
			expect(thTexts).toStrictEqual(['Name', 'Age']);
		});

		test('GFM table data cells contain correct text', () => {
			const doc = parse('| A | B |\n| - | - |\n| 1 | 2 |\n| 3 | 4 |\n');
			const tds = doc.nodeList.filter(n => n?.type === 'starttag' && n.nodeName === 'td');
			expect(tds.length).toBe(4);
			const tdTexts = tds.map(td => td.childNodes.find(c => c.type === 'text')?.raw);
			expect(tdTexts).toStrictEqual(['1', '2', '3', '4']);
		});

		test('GFM table with only header row has 0 td cells', () => {
			const doc = parse('| A | B |\n| - | - |\n');
			const ths = doc.nodeList.filter(n => n?.type === 'starttag' && n.nodeName === 'th');
			expect(ths.length).toBe(2);
			const tds = doc.nodeList.filter(n => n?.type === 'starttag' && n.nodeName === 'td');
			expect(tds.length).toBe(0);
		});

		test('GFM strikethrough becomes <del> element', () => {
			const doc = parse('~~deleted~~\n');
			const del = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'del');
			expect(del).toBeDefined();
		});

		test('GFM strikethrough contains correct text content', () => {
			const doc = parse('~~deleted text~~\n');
			const del = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'del');
			expect(del).toBeDefined();
			const text = del!.childNodes.find(c => c.type === 'text');
			expect(text).toBeDefined();
			expect(text!.raw).toBe('deleted text');
		});
	});

	describe('HTML blocks', () => {
		test('simple div (remark html node)', () => {
			const doc = parse('<div>hello</div>');
			const maps = nodeListToDebugMaps(doc.nodeList);
			expect(maps).toStrictEqual([
				'[1:1]>[1:6](0,5)div: <div>',
				'[1:6]>[1:11](5,10)#text: hello',
				'[1:11]>[1:17](10,16)div: </div>',
			]);
		});

		test('HTML block in markdown', () => {
			const doc = parse('# Heading\n\n<div class="note">\n  <p>content</p>\n</div>\n');
			// Heading is now an h1 element
			const h1 = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'h1');
			expect(h1).toBeDefined();
			// HTML block div is still present
			const div = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'div');
			expect(div).toBeDefined();
		});

		test('HTML comment (block-level)', () => {
			const doc = parse('<!-- comment -->\n');
			const maps = nodeListToDebugMaps(doc.nodeList);
			expect(maps).toStrictEqual(['[1:1]>[1:17](0,16)#comment: <!--\u2423comment\u2423-->']);
		});

		test('inline HTML in paragraph', () => {
			const doc = parse('This is <em>emphasized</em> text');
			const p = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'p');
			expect(p).toBeDefined();
			const em = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'em');
			expect(em).toBeDefined();
		});

		test('self-closing void element', () => {
			const doc = parse('<hr>');
			const maps = nodeListToDebugMaps(doc.nodeList);
			expect(maps).toStrictEqual(['[1:1]>[1:5](0,4)hr: <hr>']);
		});
	});

	describe('Front matter', () => {
		test('YAML front matter becomes psblock', () => {
			const doc = parse('---\ntitle: Test\n---\n\n<div>content</div>\n');
			const yaml = doc.nodeList.find(n => n?.type === 'psblock' && n.nodeName === '#ps:yaml');
			expect(yaml).toBeDefined();
			const div = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'div');
			expect(div).toBeDefined();
		});
	});

	describe('Adjacent HTML blocks', () => {
		test('remark splits adjacent HTML blocks separated by blank lines', () => {
			const doc = parse('<div class="wrapper">\n\n<p>paragraph inside div</p>\n\n</div>\n');
			const div = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'div');
			expect(div).toBeDefined();
			const p = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'p');
			expect(p).toBeDefined();
		});
	});

	describe('Multiple HTML comments', () => {
		test('consecutive comments are parsed', () => {
			const doc = parse('<!-- TODO: fix this -->\n<!-- NOTE: this is a note -->\n');
			const comments = doc.nodeList.filter(n => n?.type === 'comment');
			expect(comments.length).toBe(2);
		});
	});

	describe('HTML with entities', () => {
		test('HTML entities in HTML blocks are preserved', () => {
			const doc = parse('<p>&amp; &lt; &gt;</p>\n');
			const p = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'p');
			expect(p).toBeDefined();
			const text = doc.nodeList.find(n => n?.type === 'text' && n.raw.includes('&amp;'));
			expect(text).toBeDefined();
		});
	});

	describe('Multiple void elements', () => {
		test('consecutive void elements with newlines between them', () => {
			const doc = parse('<br>\n<hr>\n<img src="test.png" alt="test">\n');
			const br = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'br');
			const hr = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'hr');
			const img = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'img');
			expect(br).toBeDefined();
			expect(hr).toBeDefined();
			expect(img).toBeDefined();
		});
	});

	describe('State isolation between parse() calls', () => {
		test('definitions do not leak across parse() calls', () => {
			// First parse: define [ref]
			const doc1 = parse('[link][ref]\n\n[ref]: https://example.com\n');
			const a = doc1.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'a');
			expect(a).toBeDefined();

			// Second parse: [ref] without definition — should NOT resolve
			const doc2 = parse('[link][ref]\n');
			const a2 = doc2.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'a');
			expect(a2).toBeUndefined();
			const text = doc2.nodeList.find(n => n?.type === 'text');
			expect(text).toBeDefined();
			expect(text!.raw).toContain('[link][ref]');
		});

		test('table header state does not leak across parse() calls', () => {
			// First parse: table with header
			const doc1 = parse('| A |\n| - |\n| 1 |\n');
			const ths1 = doc1.nodeList.filter(n => n?.type === 'starttag' && n.nodeName === 'th');
			expect(ths1.length).toBe(1);

			// Second parse: different table
			const doc2 = parse('| B |\n| - |\n| 2 |\n');
			const ths2 = doc2.nodeList.filter(n => n?.type === 'starttag' && n.nodeName === 'th');
			expect(ths2.length).toBe(1);
			const tds2 = doc2.nodeList.filter(n => n?.type === 'starttag' && n.nodeName === 'td');
			expect(tds2.length).toBe(1);
		});
	});

	describe('Multiple tables in one document', () => {
		test('two GFM tables both have correct th/td', () => {
			const doc = parse('| A | B |\n| - | - |\n| 1 | 2 |\n\n| C | D |\n| - | - |\n| 3 | 4 |\n');
			const tables = doc.nodeList.filter(n => n?.type === 'starttag' && n.nodeName === 'table');
			expect(tables.length).toBe(2);
			const ths = doc.nodeList.filter(n => n?.type === 'starttag' && n.nodeName === 'th');
			expect(ths.length).toBe(4);
			const tds = doc.nodeList.filter(n => n?.type === 'starttag' && n.nodeName === 'td');
			expect(tds.length).toBe(4);
		});
	});

	describe('collectDefinitions duplicate identifier', () => {
		test('first definition wins for duplicate identifiers (CommonMark spec)', () => {
			const doc = parse('[link][ref]\n\n[ref]: https://first.com\n[ref]: https://second.com\n');
			const a = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'a');
			expect(a).toBeDefined();
			const href = a!.attributes.find(attr => attr.type === 'attr' && attr.name.raw === 'href');
			expect(href).toBeDefined();
			expect(href!.value.raw).toBe('https://first.com');
		});
	});

	describe('Empty link', () => {
		test('empty link text [](url) produces <a> element', () => {
			const doc = parse('[](https://example.com)\n');
			const a = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'a');
			expect(a).toBeDefined();
			const href = a!.attributes.find(attr => attr.type === 'attr' && attr.name.raw === 'href');
			expect(href).toBeDefined();
			expect(href!.value.raw).toBe('https://example.com');
		});
	});

	describe('Footnotes', () => {
		test('footnoteReference becomes psblock with correct raw', () => {
			const doc = parse('Text with a note[^1]\n\n[^1]: Footnote content\n');
			const fnRef = doc.nodeList.find(n => n?.type === 'psblock' && n.nodeName === '#ps:footnoteReference');
			expect(fnRef).toBeDefined();
			expect(fnRef!.nodeName).toBe('#ps:footnoteReference');
			expect(fnRef!.raw).toBe('[^1]');
		});

		test('footnoteDefinition becomes psblock with correct raw', () => {
			const doc = parse('Text with a note[^1]\n\n[^1]: Footnote content\n');
			const fnDef = doc.nodeList.find(n => n?.type === 'psblock' && n.nodeName === '#ps:footnoteDefinition');
			expect(fnDef).toBeDefined();
			expect(fnDef!.nodeName).toBe('#ps:footnoteDefinition');
			expect(fnDef!.raw).toContain('Footnote content');
		});
	});

	describe('GFM table alignment', () => {
		test('table with alignment syntax produces correct th/td', () => {
			// TODO: GFM align attribute is not yet mapped to HTML align attribute
			const doc = parse('| Left | Center | Right |\n| :--- | :---: | ---: |\n| a | b | c |\n');
			const table = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'table');
			expect(table).toBeDefined();
			const ths = doc.nodeList.filter(n => n?.type === 'starttag' && n.nodeName === 'th');
			expect(ths.length).toBe(3);
			const tds = doc.nodeList.filter(n => n?.type === 'starttag' && n.nodeName === 'td');
			expect(tds.length).toBe(3);
			const thTexts = ths.map(th => th.childNodes.find(c => c.type === 'text')?.raw);
			expect(thTexts).toStrictEqual(['Left', 'Center', 'Right']);
		});
	});

	describe('Deep nesting', () => {
		test('blockquote > list > emphasis > link', () => {
			const doc = parse('> - *[link text](https://example.com)*\n');
			const blockquote = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'blockquote');
			expect(blockquote).toBeDefined();
			const ul = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'ul');
			expect(ul).toBeDefined();
			const em = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'em');
			expect(em).toBeDefined();
			const a = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'a');
			expect(a).toBeDefined();
			const href = a!.attributes.find(attr => attr.type === 'attr' && attr.name.raw === 'href');
			expect(href!.value.raw).toBe('https://example.com');
		});
	});

	describe('GFM autolink (email)', () => {
		test('plain email address is autolinked to <a> with mailto href', () => {
			const doc = parse('user@example.com');
			const a = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'a');
			expect(a).toBeDefined();
			const href = a!.attributes.find(attr => attr.type === 'attr' && attr.name.raw === 'href');
			expect(href).toBeDefined();
			expect(href!.value.raw).toBe('mailto:user@example.com');
			// Should have text child with the email address
			const text = a!.childNodes.find(c => c.type === 'text');
			expect(text).toBeDefined();
			expect(text!.raw).toBe('user@example.com');
		});

		test('email address in list item is autolinked', () => {
			const doc = parse('- user@example.com or admin@example.org');
			const links = doc.nodeList.filter(n => n?.type === 'starttag' && n.nodeName === 'a');
			expect(links.length).toBe(2);
			const hrefValues = links.map(
				l => l.attributes.find(a => a.type === 'attr' && a.name.raw === 'href')?.value.raw,
			);
			expect(hrefValues).toStrictEqual(['mailto:user@example.com', 'mailto:admin@example.org']);
		});
	});

	describe('Edge cases', () => {
		test('empty input produces empty nodeList', () => {
			const doc = parse('');
			expect(doc.nodeList).toStrictEqual([]);
		});

		test('whitespace-only input produces empty nodeList', () => {
			const doc = parse('   \n');
			expect(doc.nodeList).toStrictEqual([]);
		});
	});

	describe('Error handling', () => {
		test('invalid HTML in HTML block does not throw', () => {
			// Markdown parser should gracefully handle invalid HTML
			expect(() => parse('<div><span>unclosed tags')).not.toThrow();
		});
	});

	describe('Attributes with special characters', () => {
		test('attributes containing spaces are preserved in HTML blocks', () => {
			const doc = parse('<div data-value="hello world" class="foo bar">content</div>\n');
			const div = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'div');
			expect(div).toBeDefined();
			const dataValue = div!.attributes.find(a => a.type === 'attr' && a.name.raw === 'data-value');
			expect(dataValue).toBeDefined();
			expect(dataValue!.value.raw).toBe('hello world');
		});
	});

	describe('Nested HTML elements', () => {
		test('deeply nested HTML elements are fully parsed', () => {
			const doc = parse('<div>\n  <span>\n    <strong>deep</strong>\n  </span>\n</div>\n');
			const div = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'div');
			expect(div).toBeDefined();
			const span = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'span');
			expect(span).toBeDefined();
			const strong = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'strong');
			expect(strong).toBeDefined();
		});
	});

	describe('Multiple separate HTML blocks in markdown', () => {
		test('HTML blocks separated by markdown content', () => {
			const doc = parse('# Heading 1\n\n<div>block 1</div>\n\nSome text.\n\n<div>block 2</div>\n');
			const h1 = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'h1');
			expect(h1).toBeDefined();
			const p = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'p');
			expect(p).toBeDefined();
			const divs = doc.nodeList.filter(n => n?.type === 'starttag' && n.nodeName === 'div');
			expect(divs.length).toBe(2);
		});
	});

	describe('HTML immediately after front matter', () => {
		test('HTML on the line immediately after front matter closing fence', () => {
			const doc = parse('---\ntitle: Test\n---\n<div>immediately after</div>\n');
			const yaml = doc.nodeList.find(n => n?.type === 'psblock' && n.nodeName === '#ps:yaml');
			expect(yaml).toBeDefined();
			const div = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'div');
			expect(div).toBeDefined();
		});
	});

	describe('Mixed inline HTML tags', () => {
		test('inline HTML tags within paragraph', () => {
			const doc = parse('This has <em>emphasis</em> and <strong>strong</strong> text\n');
			const p = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'p');
			expect(p).toBeDefined();
			const em = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'em');
			expect(em).toBeDefined();
			const strong = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'strong');
			expect(strong).toBeDefined();
		});
	});

	describe('Document metadata', () => {
		test('isFragment is true', () => {
			const doc = parse('<div>hello</div>');
			expect(doc.isFragment).toBe(true);
		});

		test('raw preserves original source', () => {
			const source = '# Hello\n\n<div>world</div>\n';
			const doc = parse(source);
			expect(doc.raw).toBe(source);
		});
	});

	describe('imageReference edge cases', () => {
		test('imageReference without title in definition does NOT have title attribute', () => {
			const doc = parse('![alt text][img]\n\n[img]: image.png\n');
			const img = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'img');
			expect(img).toBeDefined();
			const title = img!.attributes.find(attr => attr.type === 'attr' && attr.name.raw === 'title');
			expect(title).toBeUndefined();
			// Only src and alt attributes
			expect(img!.attributes.length).toBe(2);
		});

		test('imageReference with empty alt ![][ref]', () => {
			const doc = parse('![][img]\n\n[img]: image.png\n');
			const img = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'img');
			expect(img).toBeDefined();
			const alt = img!.attributes.find(attr => attr.type === 'attr' && attr.name.raw === 'alt');
			expect(alt).toBeDefined();
			expect(alt!.value.raw).toBe('');
			const src = img!.attributes.find(attr => attr.type === 'attr' && attr.name.raw === 'src');
			expect(src).toBeDefined();
			expect(src!.value.raw).toBe('image.png');
		});

		test('same definition used by multiple imageReferences', () => {
			const doc = parse('![first][img]\n\n![second][img]\n\n[img]: photo.png\n');
			const imgs = doc.nodeList.filter(n => n?.type === 'starttag' && n.nodeName === 'img');
			expect(imgs.length).toBe(2);
			const alts = imgs.map(
				img => img.attributes.find(a => a.type === 'attr' && a.name.raw === 'alt')?.value.raw,
			);
			expect(alts).toStrictEqual(['first', 'second']);
			const srcValues = imgs.map(
				img => img.attributes.find(a => a.type === 'attr' && a.name.raw === 'src')?.value.raw,
			);
			expect(srcValues).toStrictEqual(['photo.png', 'photo.png']);
		});
	});

	describe('State isolation: empty-nonEmpty-empty cycle', () => {
		test('empty parse after non-empty parse returns empty nodeList', () => {
			const doc1 = parse('# Heading\n\n[link][ref]\n\n[ref]: url\n');
			expect(doc1.nodeList.length).toBeGreaterThan(0);

			const doc2 = parse('');
			expect(doc2.nodeList).toStrictEqual([]);

			const doc3 = parse('# Another heading');
			const h1 = doc3.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'h1');
			expect(h1).toBeDefined();
		});
	});
});

describe('Embedded HTML — parseErrors propagation (#3844)', () => {
	test('emits tokenizer-level parse5 events for malformed embedded HTML', () => {
		// `<div a a>` triggers parse5 `duplicate-attribute`. Even though the
		// HTML lives inside Markdown, the tokenizer-level error must surface
		// on `MLASTDocument.parseErrors`.
		const doc = parse('# heading\n\n<div a a></div>\n');
		const codes = (doc.parseErrors ?? []).map(e => e.code);
		expect(codes).toContain('duplicate-attribute');
	});

	test('forces fragment parsing so document-level parse5 events do NOT leak from embedded HTML', () => {
		// Without `documentMode: 'fragment'` forcing, a bare `<head>` in an
		// inline HTML block would trip parse5's `missing-doctype` (since the
		// internal HtmlParser would auto-detect document mode and complain
		// about the missing `<!doctype html>`). Forcing fragment mode in
		// `markdown-parser` is what prevents that leak — this test pins that
		// contract.
		const doc = parse('# heading\n\n<head><meta charset="utf-8"></head>\n');
		const codes = (doc.parseErrors ?? []).map(e => e.code);
		expect(codes).not.toContain('missing-doctype');
		expect(codes).not.toContain('misplaced-doctype');
		expect(codes).not.toContain('non-conforming-doctype');
	});
});

describe('getLineAndColumn', () => {
	test('returns line 1, col 1 for offset 0', () => {
		expect(getLineAndColumn('hello', 0)).toStrictEqual({ line: 1, col: 1 });
	});

	test('correctly counts lines across newlines', () => {
		expect(getLineAndColumn('aaa\nbbb\nccc', 4)).toStrictEqual({ line: 2, col: 1 });
		expect(getLineAndColumn('aaa\nbbb\nccc', 5)).toStrictEqual({ line: 2, col: 2 });
		expect(getLineAndColumn('aaa\nbbb\nccc', 8)).toStrictEqual({ line: 3, col: 1 });
	});

	test('handles empty string at offset 0', () => {
		expect(getLineAndColumn('', 0)).toStrictEqual({ line: 1, col: 1 });
	});

	test('offset at end of line (before newline)', () => {
		expect(getLineAndColumn('abc\n', 3)).toStrictEqual({ line: 1, col: 4 });
	});
});
