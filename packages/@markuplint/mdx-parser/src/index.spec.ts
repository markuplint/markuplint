import { describe, test, expect } from 'vitest';

import { nodeListToDebugMaps } from '@markuplint/parser-utils';

import { parser } from './parser.js';

function parse(code: string) {
	return parser.parse(code);
}

describe('MDXParser', () => {
	describe('JSX elements', () => {
		test('self-closing component', () => {
			const doc = parse('<MyComponent prop="value" />');
			const maps = nodeListToDebugMaps(doc.nodeList);
			expect(maps).toStrictEqual(['[1:1]>[1:29](0,28)MyComponent: <MyComponent␣prop="value"␣/>']);
		});

		test('HTML element with children', () => {
			const doc = parse('<div>hello</div>');
			const maps = nodeListToDebugMaps(doc.nodeList);
			expect(maps).toStrictEqual([
				'[1:1]>[1:6](0,5)div: <div>',
				'[1:6]>[1:11](5,10)#text: hello',
				'[1:11]>[1:17](10,16)div: </div>',
			]);
		});

		test('block-level JSX element', () => {
			const doc = parse('<Card>\n  content\n</Card>\n');
			const maps = nodeListToDebugMaps(doc.nodeList);
			expect(maps[0]).toBe('[1:1]>[1:7](0,6)Card: <Card>');
			expect(maps.at(-1)).toBe('[3:1]>[3:8](17,24)Card: </Card>');
		});
	});

	describe('Component detection', () => {
		test('uppercase name is authored element', () => {
			const doc = parse('<MyComponent />');
			const startTag = doc.nodeList.find(n => n?.type === 'starttag');
			expect(startTag?.elementType).toBe('authored');
		});

		test('lowercase name is HTML element', () => {
			const doc = parse('<div>x</div>');
			const startTag = doc.nodeList.find(n => n?.type === 'starttag');
			expect(startTag?.elementType).toBe('html');
		});
	});

	describe('Expressions', () => {
		test('block expression becomes psblock', () => {
			const doc = parse('{1 + 1}');
			const maps = nodeListToDebugMaps(doc.nodeList);
			expect(maps).toStrictEqual(['[1:1]>[1:8](0,7)#ps:mdxFlowExpression: {1␣+␣1}']);
		});

		test('import becomes psblock', () => {
			const doc = parse('import X from "./x"');
			const maps = nodeListToDebugMaps(doc.nodeList);
			expect(maps).toStrictEqual(['[1:1]>[1:20](0,19)#ps:mdxjsEsm: import␣X␣from␣"./x"']);
		});

		test('export becomes psblock', () => {
			const doc = parse('export const x = 1');
			const maps = nodeListToDebugMaps(doc.nodeList);
			expect(maps).toStrictEqual(['[1:1]>[1:19](0,18)#ps:mdxjsEsm: export␣const␣x␣=␣1']);
		});
	});

	describe('Markdown content', () => {
		test('heading becomes h1 element', () => {
			const doc = parse('# Hello');
			const h1 = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'h1');
			expect(h1).toBeDefined();
			expect(h1!.elementType).toBe('html');
		});

		test.each([
			['## H2', 'h2'],
			['### H3', 'h3'],
			['#### H4', 'h4'],
			['##### H5', 'h5'],
			['###### H6', 'h6'],
		] as const)('heading %s becomes %s element', (md, tag) => {
			const doc = parse(md);
			const el = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === tag);
			expect(el).toBeDefined();
			expect(el!.elementType).toBe('html');
		});

		test('paragraph becomes p element', () => {
			const doc = parse('Some text here.');
			const p = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'p');
			expect(p).toBeDefined();
		});

		test('emphasis becomes em element', () => {
			const doc = parse('*emphasized*');
			const em = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'em');
			expect(em).toBeDefined();
			const text = em!.childNodes.find(c => c.type === 'text');
			expect(text).toBeDefined();
			expect(text!.raw).toBe('emphasized');
		});

		test('strong becomes strong element', () => {
			const doc = parse('**bold**');
			const strong = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'strong');
			expect(strong).toBeDefined();
			const text = strong!.childNodes.find(c => c.type === 'text');
			expect(text).toBeDefined();
			expect(text!.raw).toBe('bold');
		});

		test('link becomes <a> with href', () => {
			const doc = parse('[link](https://example.com)');
			const a = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'a');
			expect(a).toBeDefined();
			const href = a!.attributes.find(attr => attr.type === 'attr' && attr.name.raw === 'href');
			expect(href).toBeDefined();
			expect(href!.value.raw).toBe('https://example.com');
		});

		test('image becomes <img> with src and alt', () => {
			const doc = parse('![alt text](image.png)');
			const img = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'img');
			expect(img).toBeDefined();
			const src = img!.attributes.find(attr => attr.type === 'attr' && attr.name.raw === 'src');
			expect(src!.value.raw).toBe('image.png');
			const alt = img!.attributes.find(attr => attr.type === 'attr' && attr.name.raw === 'alt');
			expect(alt!.value.raw).toBe('alt text');
		});
	});

	describe('Front matter', () => {
		test('YAML front matter becomes psblock', () => {
			const doc = parse('---\ntitle: Test\n---\n\n<div>x</div>\n');
			const maps = nodeListToDebugMaps(doc.nodeList);
			expect(maps[0]).toBe('[1:1]>[3:4](0,19)#ps:yaml: ---⏎title:␣Test⏎---');
		});
	});

	describe('Error handling', () => {
		test('unclosed JSX tag throws ParserError', () => {
			// MDX requires explicit closing tags, unlike HTML.
			// remark-mdx throws a ParserError when a tag is not closed.
			expect(() => parse('<div>unclosed tag in MDX\n')).toThrow(/Expected a closing tag for `<div>`/);
		});

		test('invalid expression throws ParserError', () => {
			// Malformed JS expressions inside {} are rejected by acorn.
			expect(() => parse('{1 +}\n')).toThrow(/Could not parse expression with acorn/);
		});

		test('mismatched closing tag throws ParserError', () => {
			// MDX enforces matching open/close tag names (XML-style).
			expect(() => parse('<div>text</span>\n')).toThrow(
				/Unexpected closing tag `<\/span>`, expected corresponding closing tag for `<div>`/,
			);
		});

		test('empty input returns empty nodeList without throwing', () => {
			const doc = parse('');
			expect(doc.nodeList).toStrictEqual([]);
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

	describe('JSX Fragments', () => {
		test('fragment with children produces starttag node', () => {
			const doc = parse('<>\n  <div>inside fragment</div>\n</>');
			const maps = nodeListToDebugMaps(doc.nodeList);
			expect(maps).toStrictEqual(['[1:1]>[1:3](0,2)#jsx-fragment: <>']);
		});

		test('fragment starttag has nodeName #jsx-fragment', () => {
			const doc = parse('<>\n  <div>inside fragment</div>\n</>');
			const startTag = doc.nodeList.find(n => n?.type === 'starttag');
			expect(startTag?.nodeName).toBe('#jsx-fragment');
		});
	});

	describe('Dot notation components', () => {
		test('dot notation component is parsed as authored element', () => {
			const doc = parse('<Layout.Header>content</Layout.Header>');
			const maps = nodeListToDebugMaps(doc.nodeList);
			expect(maps).toStrictEqual([
				'[1:1]>[1:16](0,15)Layout.Header: <Layout.Header>',
				'[1:16]>[1:23](15,22)#text: content',
				'[1:23]>[1:39](22,38)Layout.Header: </Layout.Header>',
			]);
		});

		test('dot notation elementType is authored', () => {
			const doc = parse('<Layout.Header>content</Layout.Header>');
			const startTag = doc.nodeList.find(n => n?.type === 'starttag');
			expect(startTag?.elementType).toBe('authored');
		});
	});

	describe('Expression attributes', () => {
		test('curly-brace attribute values are marked as dynamic', () => {
			const doc = parse('<Component data={value} style={{ color: "red" }} />');
			const startTag = doc.nodeList.find(n => n?.type === 'starttag');
			expect(startTag).toBeDefined();
			const attrs = startTag!.attributes;
			expect(attrs).toHaveLength(2);

			const dataAttr = attrs.find(a => a.type === 'attr' && a.name.raw === 'data');
			expect(dataAttr).toBeDefined();
			expect(dataAttr!.isDynamicValue).toBe(true);
			expect(dataAttr!.value.raw).toBe('value');

			const styleAttr = attrs.find(a => a.type === 'attr' && a.name.raw === 'style');
			expect(styleAttr).toBeDefined();
			expect(styleAttr!.isDynamicValue).toBe(true);
			expect(styleAttr!.value.raw).toBe('{ color: "red" }');
		});

		test('debug map for expression attributes', () => {
			const doc = parse('<Component data={value} style={{ color: "red" }} />');
			const maps = nodeListToDebugMaps(doc.nodeList);
			expect(maps).toStrictEqual([
				'[1:1]>[1:52](0,51)Component: <Component␣data={value}␣style={{␣color:␣"red"␣}}␣/>',
			]);
		});
	});

	describe('Spread attributes', () => {
		test('spread attribute is detected as spread type', () => {
			const doc = parse('<Component {...props} />');
			const startTag = doc.nodeList.find(n => n?.type === 'starttag');
			expect(startTag).toBeDefined();
			const attrs = startTag!.attributes;
			expect(attrs).toHaveLength(1);
			expect(attrs[0].type).toBe('spread');
			expect(attrs[0].raw).toBe('{...props}');
		});

		test('debug map for spread attribute element', () => {
			const doc = parse('<Component {...props} />');
			const maps = nodeListToDebugMaps(doc.nodeList);
			expect(maps).toStrictEqual(['[1:1]>[1:25](0,24)Component: <Component␣{...props}␣/>']);
		});
	});

	describe('Nested JSX elements', () => {
		test('outer element wraps inner as child', () => {
			const doc = parse('<Outer>\n  <Inner>content</Inner>\n</Outer>');
			const maps = nodeListToDebugMaps(doc.nodeList);
			expect(maps[0]).toBe('[1:1]>[1:8](0,7)Outer: <Outer>');
			expect(maps.at(-1)).toBe('[3:1]>[3:9](33,41)Outer: </Outer>');
		});

		test('inner JSX element appears in nodeList', () => {
			const doc = parse('<Outer>\n  <Inner>content</Inner>\n</Outer>');
			const maps = nodeListToDebugMaps(doc.nodeList);
			// remark-mdx wraps inline children in a paragraph; now parsed as p element
			expect(maps[1]).toBe('[2:3]>[2:10](10,17)Inner: <Inner>');
		});

		test('outer element types are authored', () => {
			const doc = parse('<Outer>\n  <Inner>content</Inner>\n</Outer>');
			const outerStart = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'Outer');
			expect(outerStart?.elementType).toBe('authored');
		});
	});

	describe('Mixed content in paragraphs (inline JSX)', () => {
		test('paragraph with inline JSX is unwrapped into individual nodes', () => {
			const doc = parse('Text with <Badge color="blue">inline</Badge> component.');
			const maps = nodeListToDebugMaps(doc.nodeList);
			expect(maps).toStrictEqual([
				'[1:1]>[1:11](0,10)#text: Text␣with␣',
				'[1:11]>[1:31](10,30)Badge: <Badge␣color="blue">',
				'[1:31]>[1:37](30,36)#text: inline',
				'[1:37]>[1:45](36,44)Badge: </Badge>',
				'[1:45]>[1:56](44,55)#text: ␣component.',
			]);
		});

		test('inline JSX component is authored element', () => {
			const doc = parse('Text with <Badge color="blue">inline</Badge> component.');
			const badge = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'Badge');
			expect(badge?.elementType).toBe('authored');
		});
	});

	describe('JSX comments', () => {
		test('JSX comment becomes mdxFlowExpression psblock', () => {
			const doc = parse('{/* This is a comment */}');
			const maps = nodeListToDebugMaps(doc.nodeList);
			expect(maps).toStrictEqual(['[1:1]>[1:26](0,25)#ps:mdxFlowExpression: {/*␣This␣is␣a␣comment␣*/}']);
		});
	});

	describe('Multiple imports with component usage', () => {
		test('imports are combined into single ESM psblock', () => {
			const doc = parse(
				'import { Alert } from "./Alert"\nimport { Badge } from "./Badge"\n\n<Alert type="warning">\n  <Badge>NEW</Badge>\n</Alert>',
			);
			const maps = nodeListToDebugMaps(doc.nodeList);

			// Both imports become a single mdxjsEsm psblock
			expect(maps[0]).toBe(
				'[1:1]>[2:32](0,63)#ps:mdxjsEsm: import␣{␣Alert␣}␣from␣"./Alert"⏎import␣{␣Badge␣}␣from␣"./Badge"',
			);

			// Alert element start tag
			expect(maps[1]).toBe('[4:1]>[4:23](65,87)Alert: <Alert␣type="warning">');

			// Alert element end tag
			expect(maps.at(-1)).toBe('[6:1]>[6:9](109,117)Alert: </Alert>');
		});

		test('Alert component is authored', () => {
			const doc = parse(
				'import { Alert } from "./Alert"\nimport { Badge } from "./Badge"\n\n<Alert type="warning">\n  <Badge>NEW</Badge>\n</Alert>',
			);
			const alert = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'Alert');
			expect(alert?.elementType).toBe('authored');
		});
	});

	describe('Markdown mixed with JSX', () => {
		test('realistic MDX document structure', () => {
			const doc = parse('# Heading\n\nSome paragraph text.\n\n<Card>content</Card>\n\nMore paragraph text.');
			const maps = nodeListToDebugMaps(doc.nodeList);
			expect(maps).toStrictEqual([
				'[1:1]>[1:10](0,9)h1: #␣Heading',
				'[1:3]>[1:10](2,9)#text: Heading',
				'[3:1]>[3:21](11,31)p: Some␣paragraph␣text.',
				'[3:1]>[3:21](11,31)#text: Some␣paragraph␣text.',
				'[5:1]>[5:7](33,39)Card: <Card>',
				'[5:7]>[5:14](39,46)#text: content',
				'[5:14]>[5:21](46,53)Card: </Card>',
				'[7:1]>[7:21](55,75)p: More␣paragraph␣text.',
				'[7:1]>[7:21](55,75)#text: More␣paragraph␣text.',
			]);
		});

		test('heading is an h1 element', () => {
			const doc = parse('# Heading\n\nSome paragraph text.\n\n<Card>content</Card>\n\nMore paragraph text.');
			const heading = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'h1');
			expect(heading).toBeDefined();
			expect(heading!.type).toBe('starttag');
		});

		test('Card element is authored', () => {
			const doc = parse('# Heading\n\nSome paragraph text.\n\n<Card>content</Card>\n\nMore paragraph text.');
			const card = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'Card');
			expect(card?.elementType).toBe('authored');
		});
	});

	describe('Boolean attributes in JSX', () => {
		test('boolean attributes have empty value', () => {
			const doc = parse('<Input disabled required name="email" />');
			const startTag = doc.nodeList.find(n => n?.type === 'starttag');
			expect(startTag).toBeDefined();
			const attrs = startTag!.attributes;
			expect(attrs).toHaveLength(3);

			const disabled = attrs.find(a => a.type === 'attr' && a.name.raw === 'disabled');
			expect(disabled).toBeDefined();
			expect(disabled!.value.raw).toBe('');

			const required = attrs.find(a => a.type === 'attr' && a.name.raw === 'required');
			expect(required).toBeDefined();
			expect(required!.value.raw).toBe('');

			const name = attrs.find(a => a.type === 'attr' && a.name.raw === 'name');
			expect(name).toBeDefined();
			expect(name!.value.raw).toBe('email');
		});

		test('debug map for boolean attributes', () => {
			const doc = parse('<Input disabled required name="email" />');
			const maps = nodeListToDebugMaps(doc.nodeList);
			expect(maps).toStrictEqual(['[1:1]>[1:41](0,40)Input: <Input␣disabled␣required␣name="email"␣/>']);
		});
	});

	describe('Self-closing HTML void elements in MDX', () => {
		test('void elements are parsed as individual nodes', () => {
			const doc = parse('<br />\n<hr />\n<img src="test.png" alt="test" />');
			const maps = nodeListToDebugMaps(doc.nodeList);
			expect(maps).toStrictEqual([
				'[1:1]>[1:7](0,6)br: <br␣/>',
				'[2:1]>[2:7](7,13)hr: <hr␣/>',
				'[3:1]>[3:34](14,47)img: <img␣src="test.png"␣alt="test"␣/>',
			]);
		});

		test('void elements are html type', () => {
			const doc = parse('<br />\n<hr />\n<img src="test.png" alt="test" />');
			const br = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'br');
			const hr = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'hr');
			const img = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'img');
			expect(br?.elementType).toBe('html');
			expect(hr?.elementType).toBe('html');
			expect(img?.elementType).toBe('html');
		});

		test('img element has attributes', () => {
			const doc = parse('<br />\n<hr />\n<img src="test.png" alt="test" />');
			const img = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'img');
			expect(img).toBeDefined();
			expect(img!.attributes).toHaveLength(2);

			const src = img!.attributes.find(a => a.type === 'attr' && a.name.raw === 'src');
			expect(src).toBeDefined();
			expect(src!.value.raw).toBe('test.png');

			const alt = img!.attributes.find(a => a.type === 'attr' && a.name.raw === 'alt');
			expect(alt).toBeDefined();
			expect(alt!.value.raw).toBe('test');
		});
	});

	describe('Empty component (no children, no attributes)', () => {
		test('empty self-closing component is parsed correctly', () => {
			const doc = parse('<Spacer />');
			const maps = nodeListToDebugMaps(doc.nodeList);
			expect(maps).toStrictEqual(['[1:1]>[1:11](0,10)Spacer: <Spacer␣/>']);
		});

		test('empty component is authored element', () => {
			const doc = parse('<Spacer />');
			const startTag = doc.nodeList.find(n => n?.type === 'starttag');
			expect(startTag?.elementType).toBe('authored');
			expect(startTag?.nodeName).toBe('Spacer');
		});

		test('empty component has no attributes', () => {
			const doc = parse('<Spacer />');
			const startTag = doc.nodeList.find(n => n?.type === 'starttag');
			expect(startTag).toBeDefined();
			expect(startTag!.attributes).toHaveLength(0);
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

		test('linkReference without title does NOT have title attribute', () => {
			const doc = parse('[link text][ref]\n\n[ref]: https://example.com\n');
			const a = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'a');
			expect(a).toBeDefined();
			const title = a!.attributes.find(attr => attr.type === 'attr' && attr.name.raw === 'title');
			expect(title).toBeUndefined();
			expect(a!.attributes.length).toBe(1);
		});

		test('imageReference resolves to <img> element with alt', () => {
			const doc = parse('![alt text][img]\n\n[img]: image.png\n');
			const img = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'img');
			expect(img).toBeDefined();
			const src = img!.attributes.find(attr => attr.type === 'attr' && attr.name.raw === 'src');
			expect(src).toBeDefined();
			expect(src!.value.raw).toBe('image.png');
			const alt = img!.attributes.find(attr => attr.type === 'attr' && attr.name.raw === 'alt');
			expect(alt).toBeDefined();
			expect(alt!.value.raw).toBe('alt text');
		});

		test('unresolved linkReference is treated as plain text', () => {
			const doc = parse('[text][missing]\n');
			const a = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'a');
			expect(a).toBeUndefined();
			const text = doc.nodeList.find(n => n?.type === 'text');
			expect(text).toBeDefined();
			expect(text!.raw).toContain('[text][missing]');
		});

		test('unresolved imageReference is treated as plain text', () => {
			const doc = parse('![alt][missing]\n');
			const img = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'img');
			expect(img).toBeUndefined();
			const text = doc.nodeList.find(n => n?.type === 'text');
			expect(text).toBeDefined();
			expect(text!.raw).toContain('![alt][missing]');
		});
	});

	describe('Blockquote with JSX', () => {
		test('JSX inside blockquote is parsed correctly', () => {
			const doc = parse('> <Badge>test</Badge>\n');
			const blockquote = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'blockquote');
			expect(blockquote).toBeDefined();
			const badge = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'Badge');
			expect(badge).toBeDefined();
			expect(badge!.elementType).toBe('authored');
			const text = badge!.childNodes.find(c => c.type === 'text');
			expect(text).toBeDefined();
			expect(text!.raw).toBe('test');
		});
	});

	describe('HTML nodes in MDX', () => {
		test('HTML comment syntax is invalid in MDX v2 (use JSX comment instead)', () => {
			// MDX v2 does not support HTML comments; it requires {/* */} syntax
			expect(() => parse('<!-- comment -->\n')).toThrow(/Unexpected character `!`/);
		});

		test('JSX comment is valid alternative to HTML comment', () => {
			const doc = parse('{/* comment */}\n');
			const psblock = doc.nodeList.find(n => n?.type === 'psblock');
			expect(psblock).toBeDefined();
			expect(psblock!.raw).toContain('/* comment */');
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

	describe('State isolation between parse() calls', () => {
		test('definitions do not leak across MDX parse() calls', () => {
			// First parse: define [ref]
			const doc1 = parse('[link][ref]\n\n[ref]: https://example.com\n');
			const a1 = doc1.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'a');
			expect(a1).toBeDefined();

			// Second parse: [ref] without definition — should NOT resolve
			const doc2 = parse('[link][ref]\n');
			const a2 = doc2.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'a');
			expect(a2).toBeUndefined();
			const text = doc2.nodeList.find(n => n?.type === 'text');
			expect(text).toBeDefined();
			expect(text!.raw).toContain('[link][ref]');
		});

		test('table header state does not leak across MDX parse() calls', () => {
			const doc1 = parse('| A |\n| - |\n| 1 |\n');
			const ths1 = doc1.nodeList.filter(n => n?.type === 'starttag' && n.nodeName === 'th');
			expect(ths1.length).toBe(1);

			const doc2 = parse('| B |\n| - |\n| 2 |\n');
			const ths2 = doc2.nodeList.filter(n => n?.type === 'starttag' && n.nodeName === 'th');
			expect(ths2.length).toBe(1);
			const tds2 = doc2.nodeList.filter(n => n?.type === 'starttag' && n.nodeName === 'td');
			expect(tds2.length).toBe(1);
		});
	});

	describe('Inline expression in paragraph (flattenMdastChildren)', () => {
		test('paragraph with inline expression is unwrapped', () => {
			const doc = parse('Text {variable} more text');
			const expr = doc.nodeList.find(n => n?.type === 'psblock' && n.nodeName === '#ps:mdxTextExpression');
			expect(expr).toBeDefined();
			expect(expr!.raw).toBe('{variable}');
		});

		test('paragraph without JSX or expressions is preserved as <p>', () => {
			const doc = parse('Just plain paragraph text.');
			const p = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'p');
			expect(p).toBeDefined();
			// No unwrapping happened — text is inside <p>
			const text = p!.childNodes.find(c => c.type === 'text');
			expect(text).toBeDefined();
			expect(text!.raw).toBe('Just plain paragraph text.');
		});
	});

	describe('MDX inline code and code blocks', () => {
		test('inline code in MDX produces <code> element', () => {
			const doc = parse('Use `const x = 1` here');
			const code = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'code');
			expect(code).toBeDefined();
			expect(code!.childNodes.length).toBe(1);
			expect(code!.childNodes[0].raw).toBe('const x = 1');
		});

		test('fenced code block in MDX produces pre>code elements', () => {
			const doc = parse('```typescript\nconst x: number = 1;\n```\n');
			const pre = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'pre');
			expect(pre).toBeDefined();
			const code = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'code');
			expect(code).toBeDefined();
			const langAttr = code!.attributes.find(a => a.type === 'attr' && a.name.raw === 'class');
			expect(langAttr).toBeDefined();
			expect(langAttr!.value.raw).toBe('language-typescript');
			expect(code!.childNodes.length).toBe(1);
			expect(code!.childNodes[0].raw).toBe('const x: number = 1;');
		});
	});

	describe('Export default', () => {
		test('export default function becomes mdxjsEsm psblock', () => {
			const doc = parse('export default function Layout() {}\n');
			const esm = doc.nodeList.find(n => n?.type === 'psblock' && n.nodeName === '#ps:mdxjsEsm');
			expect(esm).toBeDefined();
			expect(esm!.raw).toContain('export default function Layout');
		});

		test('export default object expression', () => {
			const doc = parse("export default { title: 'My Page' }\n");
			const esm = doc.nodeList.find(n => n?.type === 'psblock' && n.nodeName === '#ps:mdxjsEsm');
			expect(esm).toBeDefined();
			expect(esm!.raw).toContain('export default');
		});
	});

	describe('Multiple named exports', () => {
		test('multiple export const statements become mdxjsEsm psblock', () => {
			const doc = parse('export const a = 1\nexport const b = 2\n');
			const esmBlocks = doc.nodeList.filter(n => n?.type === 'psblock' && n.nodeName === '#ps:mdxjsEsm');
			// remark-mdx combines adjacent exports into one ESM block
			expect(esmBlocks.length).toBeGreaterThanOrEqual(1);
			const raw = esmBlocks.map(e => e.raw).join('');
			expect(raw).toContain('export const a');
			expect(raw).toContain('export const b');
		});
	});

	describe('Multi-line JSX attributes', () => {
		test('attributes spanning multiple lines are parsed correctly', () => {
			const doc = parse('<Component\n  name="test"\n  value={42}\n  disabled\n/>\n');
			const startTag = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'Component');
			expect(startTag).toBeDefined();
			expect(startTag!.attributes.length).toBe(3);
			const name = startTag!.attributes.find(a => a.type === 'attr' && a.name.raw === 'name');
			expect(name).toBeDefined();
			expect(name!.value.raw).toBe('test');
			const value = startTag!.attributes.find(a => a.type === 'attr' && a.name.raw === 'value');
			expect(value).toBeDefined();
			expect(value!.isDynamicValue).toBe(true);
			expect(value!.value.raw).toBe('42');
			const disabled = startTag!.attributes.find(a => a.type === 'attr' && a.name.raw === 'disabled');
			expect(disabled).toBeDefined();
			expect(disabled!.value.raw).toBe('');
		});
	});

	describe('JSX children templates', () => {
		test('nested component structure (Card > CardHeader + CardBody)', () => {
			const doc = parse('<Card>\n  <CardHeader>Title</CardHeader>\n  <CardBody>Content</CardBody>\n</Card>\n');
			const card = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'Card');
			expect(card).toBeDefined();
			expect(card!.elementType).toBe('authored');
			const header = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'CardHeader');
			expect(header).toBeDefined();
			expect(header!.elementType).toBe('authored');
			const body = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'CardBody');
			expect(body).toBeDefined();
			expect(body!.elementType).toBe('authored');
		});
	});

	describe('Markdown inside JSX', () => {
		test('Markdown heading inside JSX component', () => {
			const doc = parse('<Callout>\n\n## Warning\n\nBe careful\n\n</Callout>\n');
			const callout = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'Callout');
			expect(callout).toBeDefined();
			const h2 = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'h2');
			expect(h2).toBeDefined();
			const p = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'p');
			expect(p).toBeDefined();
		});
	});

	describe('Multiple inline JSX in paragraph', () => {
		test('multiple JSX elements in same paragraph', () => {
			const doc = parse('<Badge>A</Badge> and <Badge>B</Badge>\n');
			const badges = doc.nodeList.filter(n => n?.type === 'starttag' && n.nodeName === 'Badge');
			expect(badges.length).toBe(2);
			const texts = badges.map(b => b.childNodes.find(c => c.type === 'text')?.raw);
			expect(texts).toStrictEqual(['A', 'B']);
		});
	});

	describe('Empty open/close tags (no children)', () => {
		test('element with explicit closing tag but no children', () => {
			const doc = parse('<div></div>\n');
			const div = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'div');
			expect(div).toBeDefined();
			expect(div!.elementType).toBe('html');
		});

		test('authored component with explicit closing tag but no children', () => {
			const doc = parse('<Container></Container>\n');
			const el = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'Container');
			expect(el).toBeDefined();
			expect(el!.elementType).toBe('authored');
		});
	});

	describe('Expression attribute with complex value', () => {
		test('ternary expression in attribute value', () => {
			const doc = parse('<Component value={isActive ? "yes" : "no"} />\n');
			const startTag = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'Component');
			expect(startTag).toBeDefined();
			const attr = startTag!.attributes.find(a => a.type === 'attr' && a.name.raw === 'value');
			expect(attr).toBeDefined();
			expect(attr!.isDynamicValue).toBe(true);
			expect(attr!.value.raw).toBe('isActive ? "yes" : "no"');
		});

		test('array expression in attribute value', () => {
			const doc = parse('<Component items={[1, 2, 3]} />\n');
			const startTag = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'Component');
			expect(startTag).toBeDefined();
			const attr = startTag!.attributes.find(a => a.type === 'attr' && a.name.raw === 'items');
			expect(attr).toBeDefined();
			expect(attr!.isDynamicValue).toBe(true);
			expect(attr!.value.raw).toBe('[1, 2, 3]');
		});
	});

	describe('IDL attribute name conversion', () => {
		test('className is kept as-is (IDL resolution handled by ml-core)', () => {
			const doc = parse('<div className="test">text</div>\n');
			const div = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'div');
			expect(div).toBeDefined();
			const attr = div!.attributes.find(a => a.type === 'attr' && a.name.raw === 'className');
			expect(attr).toBeDefined();
			// potentialName is not set by the parser; IDL resolution is handled by ml-core's acceptedAttrNames
			expect(attr!.potentialName).toBeUndefined();
		});

		test('htmlFor is kept as-is (IDL resolution handled by ml-core)', () => {
			const doc = parse('<label htmlFor="input-id">Label</label>\n');
			const label = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'label');
			expect(label).toBeDefined();
			const attr = label!.attributes.find(a => a.type === 'attr' && a.name.raw === 'htmlFor');
			expect(attr).toBeDefined();
			// potentialName is not set by the parser; IDL resolution is handled by ml-core's acceptedAttrNames
			expect(attr!.potentialName).toBeUndefined();
		});

		test('class in JSX is kept as-is (IDL resolution handled by ml-core)', () => {
			const doc = parse('<div class="test">text</div>\n');
			const div = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'div');
			expect(div).toBeDefined();
			const attr = div!.attributes.find(a => a.type === 'attr' && a.name.raw === 'class');
			expect(attr).toBeDefined();
			// candidate is not set by the parser; IDL resolution is handled by ml-core's acceptedAttrNames
			expect(attr!.candidate).toBeUndefined();
		});
	});

	describe('MDX Markdown elements', () => {
		test('unordered list in MDX', () => {
			const doc = parse('- item 1\n- item 2\n');
			const ul = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'ul');
			expect(ul).toBeDefined();
			const lis = doc.nodeList.filter(n => n?.type === 'starttag' && n.nodeName === 'li');
			expect(lis.length).toBe(2);
		});

		test('thematicBreak in MDX (with content around it to avoid frontmatter)', () => {
			const doc = parse('Text above\n\n---\n\nText below\n');
			const hr = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'hr');
			expect(hr).toBeDefined();
		});

		test('hard line break in MDX (two trailing spaces)', () => {
			const doc = parse('line one  \nline two\n');
			const br = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'br');
			expect(br).toBeDefined();
		});
	});

	describe('List with JSX content', () => {
		test('list items containing JSX components', () => {
			const doc = parse('- <Badge>item 1</Badge>\n- <Badge>item 2</Badge>\n');
			const ul = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'ul');
			expect(ul).toBeDefined();
			const badges = doc.nodeList.filter(n => n?.type === 'starttag' && n.nodeName === 'Badge');
			expect(badges.length).toBe(2);
		});
	});

	describe('Heading with JSX', () => {
		test('heading containing inline JSX component', () => {
			const doc = parse('# Hello <Badge>New</Badge>\n');
			const h1 = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'h1');
			expect(h1).toBeDefined();
			const badge = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'Badge');
			expect(badge).toBeDefined();
			expect(badge!.elementType).toBe('authored');
		});
	});

	describe('Deep nesting JSX', () => {
		test('three levels of nested JSX components', () => {
			const doc = parse('<Level1>\n  <Level2>\n    <Level3>deep</Level3>\n  </Level2>\n</Level1>\n');
			const l1 = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'Level1');
			const l2 = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'Level2');
			const l3 = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'Level3');
			expect(l1).toBeDefined();
			expect(l2).toBeDefined();
			expect(l3).toBeDefined();
			expect(l1!.elementType).toBe('authored');
			expect(l2!.elementType).toBe('authored');
			expect(l3!.elementType).toBe('authored');
		});
	});

	describe('Consecutive expressions', () => {
		test('multiple flow expressions in sequence', () => {
			const doc = parse('{a}\n\n{b}\n\n{c}\n');
			const exprs = doc.nodeList.filter(n => n?.type === 'psblock' && n.raw.startsWith('{'));
			expect(exprs.length).toBe(3);
			expect(exprs[0].raw).toBe('{a}');
			expect(exprs[1].raw).toBe('{b}');
			expect(exprs[2].raw).toBe('{c}');
		});
	});

	describe('Empty expression', () => {
		test('expression with only a comment', () => {
			const doc = parse('{/* empty */}\n');
			const expr = doc.nodeList.find(n => n?.type === 'psblock');
			expect(expr).toBeDefined();
			expect(expr!.raw).toBe('{/* empty */}');
		});
	});

	describe('GFM autolink with JSX', () => {
		test('autolink URL and JSX component in same paragraph', () => {
			const doc = parse('Visit https://example.com and <Badge>click</Badge>\n');
			const badge = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'Badge');
			expect(badge).toBeDefined();
			const a = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'a');
			expect(a).toBeDefined();
			const href = a!.attributes.find(attr => attr.type === 'attr' && attr.name.raw === 'href');
			expect(href).toBeDefined();
			expect(href!.value.raw).toBe('https://example.com');
		});
	});

	describe('flattenMdastChildren: expression-only paragraph', () => {
		test('paragraph containing only an expression is unwrapped (no <p>)', () => {
			const doc = parse('{variable}\n');
			const expr = doc.nodeList.find(n => n?.type === 'psblock');
			expect(expr).toBeDefined();
			const p = doc.nodeList.find(n => n?.type === 'starttag' && n.nodeName === 'p');
			expect(p).toBeUndefined();
		});
	});

	describe('GFM extensions', () => {
		test('GFM table produces table>tr>th/td elements', () => {
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
			const thTexts = ths.map(th => th.childNodes.find(c => c.type === 'text')?.raw);
			expect(thTexts).toStrictEqual(['Name', 'Age']);
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

	describe('#3825 raw-text element body via MDX expression child', () => {
		// Note: MDX's <script>{`...`}</script> path does NOT exercise parser-utils'
		// raw-text branch in `parseCodeFragment` — the body is an MDX expression child
		// and never re-tokenized. The primary value of these tests is to lock in the
		// upstream invariant "remark-mdx rejects bare `<` in element body before
		// markuplint sees it", so a future upstream relaxation can't silently change
		// observed MDX tag emissions.

		test('script body wrapped in template literal expression child', () => {
			const doc = parse('# title\n\n<div><script>{`const t = s.replace(/<br\\s*\\/?>/gi, " ");`}</script></div>');
			const tags = doc.nodeList.filter(n => n?.type === 'starttag' || n?.type === 'endtag');
			const tagSig = tags.map(t => `${t!.type}:${t!.nodeName}`);
			expect(tagSig).toContain('starttag:script');
			expect(tagSig).toContain('endtag:script');
		});

		test('style body wrapped in template literal expression child', () => {
			const doc = parse('# title\n\n<div><style>{`/* <br = */ a{color:red}`}</style></div>');
			const tags = doc.nodeList.filter(n => n?.type === 'starttag' || n?.type === 'endtag');
			const tagSig = tags.map(t => `${t!.type}:${t!.nodeName}`);
			expect(tagSig).toContain('starttag:style');
			expect(tagSig).toContain('endtag:style');
		});
	});
});
