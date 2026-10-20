import { describe, it, expect } from 'vitest';

import type { Violation } from '@markuplint/ml-config';

import type { PositionedNode, ScopedNode } from './compute-scope.js';
import {
	getAncestorChain,
	computeLCA,
	generateUniqueSelector,
	findNodeAtPosition,
	computeScopeForViolations,
	serializeIdentifier,
	splitScopeAttr,
	splitScopeNth,
	unescapeIdentifier,
} from './compute-scope.js';

/**
 * Helper to build a mock DOM tree for testing.
 * Returns a map of name → ScopedNode for easy access.
 */
function buildTree(structure: {
	tag: string;
	id?: string;
	classes?: readonly string[];
	attrs?: Record<string, string>;
	children?: Parameters<typeof buildTree>[0][];
}): ScopedNode {
	const node: ScopedNode = {
		nodeType: 1,
		localName: structure.tag,
		id: structure.id ?? '',
		classList: {
			contains: (cls: string) => structure.classes?.includes(cls) ?? false,
			[Symbol.iterator]: function* () {
				if (structure.classes) {
					yield* structure.classes;
				}
			},
		},
		attributes: Object.entries(structure.attrs ?? {}).map(([name, value]) => ({ name, value })),
		parentElement: null,
		children: [],
	};

	const children: ScopedNode[] = [];
	for (const childDef of structure.children ?? []) {
		const child = buildTree(childDef);
		(child as { parentElement: ScopedNode | null }).parentElement = node;
		children.push(child);
	}
	(node as { children: ScopedNode[] }).children = children;

	return node;
}

/** Finds a node by tag name (DFS). */
function find(root: ScopedNode, tag: string): ScopedNode | undefined {
	if (root.localName === tag) return root;
	for (const child of root.children) {
		const found = find(child, tag);
		if (found) return found;
	}
	return undefined;
}

describe('compute-scope', () => {
	// html > body > nav > ul > li*3
	//                   > footer > a
	const tree = buildTree({
		tag: 'html',
		children: [
			{
				tag: 'body',
				children: [
					{
						tag: 'nav',
						id: 'main-nav',
						classes: ['global-nav'],
						children: [
							{
								tag: 'ul',
								children: [
									{ tag: 'li', children: [{ tag: 'a' }] },
									{ tag: 'li', children: [{ tag: 'a' }] },
									{ tag: 'li', children: [{ tag: 'a' }] },
								],
							},
						],
					},
					{
						tag: 'footer',
						children: [{ tag: 'a' }],
					},
				],
			},
		],
	});

	describe('getAncestorChain', () => {
		it('returns ancestors from node to root (exclusive)', () => {
			const ul = find(tree, 'ul')!;
			const chain = getAncestorChain(ul);
			expect(chain.map(n => n.localName)).toStrictEqual(['nav', 'body', 'html']);
		});

		it('returns empty for root element', () => {
			const chain = getAncestorChain(tree);
			expect(chain).toStrictEqual([]);
		});
	});

	describe('computeLCA', () => {
		it('returns parent for a single node', () => {
			const ul = find(tree, 'ul')!;
			const lca = computeLCA([ul]);
			expect(lca?.localName).toBe('nav');
		});

		it('returns common parent for sibling nodes', () => {
			const ul = find(tree, 'ul')!;
			const lis = [...ul.children];
			const lca = computeLCA(lis);
			expect(lca?.localName).toBe('ul');
		});

		it('returns null when LCA is body (file-level fallback)', () => {
			const ul = find(tree, 'ul')!;
			const footer = find(tree, 'footer')!;
			const lca = computeLCA([ul, footer]);
			// body is a fallback tag, so LCA returns null
			expect(lca).toBeNull();
		});

		it('returns null for empty input', () => {
			expect(computeLCA([])).toBeNull();
		});

		it('returns null when LCA is html', () => {
			// Single node directly under html → LCA is html → fallback
			const body = find(tree, 'body')!;
			const lca = computeLCA([body]);
			expect(lca).toBeNull();
		});
	});

	describe('generateUniqueSelector', () => {
		it('uses id when available', () => {
			const nav = find(tree, 'nav')!;
			const selector = generateUniqueSelector(nav);
			expect(selector).toBe('#main-nav');
		});

		it('uses tag.class when no id', () => {
			const navNoId = buildTree({
				tag: 'html',
				children: [
					{
						tag: 'body',
						children: [
							{
								tag: 'nav',
								classes: ['sidebar'],
								children: [{ tag: 'ul' }],
							},
						],
					},
				],
			});
			const nav = find(navNoId, 'nav')!;
			const selector = generateUniqueSelector(nav);
			expect(selector).toBe('nav.sidebar');
		});

		it('builds ancestor path when no id or class', () => {
			const plainTree = buildTree({
				tag: 'html',
				children: [
					{
						tag: 'body',
						children: [
							{
								tag: 'main',
								children: [
									{
										tag: 'section',
										children: [{ tag: 'div' }],
									},
								],
							},
						],
					},
				],
			});
			const section = find(plainTree, 'section')!;
			const selector = generateUniqueSelector(section);
			// body is excluded from ancestor path (it's a fallback boundary)
			expect(selector).toBe('main > section');
		});

		it('returns undefined for body node', () => {
			const body = find(tree, 'body')!;
			expect(generateUniqueSelector(body)).toBeUndefined();
		});

		it('returns undefined for html node', () => {
			expect(generateUniqueSelector(tree)).toBeUndefined();
		});

		it('stops ancestor path at id', () => {
			// If an ancestor has an id, the path starts from there
			const ul = find(tree, 'ul')!;
			const selector = generateUniqueSelector(ul);
			expect(selector).toBe('#main-nav > ul');
		});

		it('uses nth-of-type for same-tag siblings', () => {
			const siblingTree = buildTree({
				tag: 'html',
				children: [
					{
						tag: 'body',
						children: [
							{
								tag: 'main',
								children: [
									{ tag: 'section', children: [{ tag: 'p' }] },
									{ tag: 'section', children: [{ tag: 'p' }] },
									{ tag: 'section', children: [{ tag: 'p' }] },
								],
							},
						],
					},
				],
			});
			const main = find(siblingTree, 'main')!;
			const sections = [...main.children];
			expect(generateUniqueSelector(sections[0]!)).toBe('main > section:nth-of-type(1)');
			expect(generateUniqueSelector(sections[1]!)).toBe('main > section:nth-of-type(2)');
			expect(generateUniqueSelector(sections[2]!)).toBe('main > section:nth-of-type(3)');
		});

		it('uses role attribute when no id or class', () => {
			const roleTree = buildTree({
				tag: 'html',
				children: [
					{
						tag: 'body',
						children: [{ tag: 'section', attrs: { role: 'navigation' } }],
					},
				],
			});
			const section = find(roleTree, 'section')!;
			expect(generateUniqueSelector(section)).toBe('section[role="navigation"]');
		});

		it('uses type attribute for input elements', () => {
			const inputTree = buildTree({
				tag: 'html',
				children: [
					{
						tag: 'body',
						children: [
							{
								tag: 'form',
								children: [
									{ tag: 'input', attrs: { type: 'text' } },
									{ tag: 'input', attrs: { type: 'checkbox' } },
								],
							},
						],
					},
				],
			});
			const form = find(inputTree, 'form')!;
			const inputs = [...form.children];
			expect(generateUniqueSelector(inputs[0]!)).toBe('input[type="text"]');
			expect(generateUniqueSelector(inputs[1]!)).toBe('input[type="checkbox"]');
		});

		it('does not use type attribute for non-input elements', () => {
			const buttonTree = buildTree({
				tag: 'html',
				children: [
					{
						tag: 'body',
						children: [{ tag: 'button', attrs: { type: 'submit' } }],
					},
				],
			});
			const button = find(buttonTree, 'button')!;
			// button has type but it's not input, so attr is not used
			expect(generateUniqueSelector(button)).toBe('button');
		});

		it('uses all classes when multiple classes exist', () => {
			const multiClassTree = buildTree({
				tag: 'html',
				children: [
					{
						tag: 'body',
						children: [{ tag: 'nav', classes: ['main', 'sticky'] }],
					},
				],
			});
			const nav = find(multiClassTree, 'nav')!;
			expect(generateUniqueSelector(nav)).toBe('nav.main.sticky');
		});

		it('escapes a `.` of an element name, as CSS does', () => {
			const dotted = buildTree({
				tag: 'html',
				children: [{ tag: 'body', children: [{ tag: 'div', children: [{ tag: 'Tabs.Root' }] }] }],
			});
			expect(generateUniqueSelector(find(dotted, 'Tabs.Root')!)).toBe(String.raw`div > Tabs\.Root`);
		});

		it('escapes a `.` of an element name that has a class', () => {
			const dotted = buildTree({
				tag: 'html',
				children: [{ tag: 'body', children: [{ tag: 'Tabs.Root', classes: ['active'] }] }],
			});
			expect(generateUniqueSelector(find(dotted, 'Tabs.Root')!)).toBe(String.raw`Tabs\.Root.active`);
		});

		it('escapes a `.` of a class name', () => {
			const dotted = buildTree({
				tag: 'html',
				children: [{ tag: 'body', children: [{ tag: 'div', classes: ['py-1.5'] }] }],
			});
			expect(generateUniqueSelector(find(dotted, 'div')!)).toBe(String.raw`div.py-1\.5`);
		});

		it('escapes a `\\` of an element name, the escape itself', () => {
			const backslash = buildTree({
				tag: 'html',
				children: [{ tag: 'body', children: [{ tag: String.raw`Foo\bar` }] }],
			});
			expect(generateUniqueSelector(find(backslash, String.raw`Foo\bar`)!)).toBe(String.raw`Foo\\bar`);
		});

		it('escapes a `#` of an element name, which a scope reads as an id when it starts a segment', () => {
			const fragment = buildTree({
				tag: 'html',
				children: [{ tag: 'body', children: [{ tag: 'div', children: [{ tag: '#jsx-fragment' }] }] }],
			});
			expect(generateUniqueSelector(find(fragment, '#jsx-fragment')!)).toBe(String.raw`div > \#jsx-fragment`);
		});

		it('escapes a `[` of a class name, as `[state="open"]` ends a segment as an attribute', () => {
			const bracket = buildTree({
				tag: 'html',
				children: [{ tag: 'body', children: [{ tag: 'div', classes: ['group-[x="y"]'] }] }],
			});
			// Behavior change: a class is written as `CSS.escape` does, so the `=`, `"` and `]` are escaped too
			expect(generateUniqueSelector(find(bracket, 'div')!)).toBe(String.raw`div.group-\[x\=\"y\"\]`);
			// expect(generateUniqueSelector(find(bracket, 'div')!)).toBe(String.raw`div.group-\[x="y"]`); // previous
		});

		it('does not use an attribute whose value a scope cannot hold: `"` and ` > `', () => {
			const quoted = buildTree({
				tag: 'html',
				children: [
					{
						tag: 'body',
						children: [
							{ tag: 'div', attrs: { role: 'a"b' } },
							{ tag: 'p', attrs: { role: 'a > b' } },
						],
					},
				],
			});
			expect(generateUniqueSelector(find(quoted, 'div')!)).toBe('div');
			expect(generateUniqueSelector(find(quoted, 'p')!)).toBe('p');
		});

		it('escapes a `.` of an element name in `tag[attr="value"]`', () => {
			const dotted = buildTree({
				tag: 'html',
				children: [{ tag: 'body', children: [{ tag: 'Tabs.Root', attrs: { role: 'tablist' } }] }],
			});
			expect(generateUniqueSelector(find(dotted, 'Tabs.Root')!)).toBe(String.raw`Tabs\.Root[role="tablist"]`);
		});

		it('escapes the `:` and the `()` of a class name that ends with `:nth-of-type(n)`, which is no position', () => {
			const nth = buildTree({
				tag: 'html',
				children: [{ tag: 'body', children: [{ tag: 'div', classes: ['a:nth-of-type(2)'] }] }],
			});
			expect(generateUniqueSelector(find(nth, 'div')!)).toBe(String.raw`div.a\:nth-of-type\(2\)`);
		});

		it('escapes a class name that ends with `:nth-of-type(n)`, among other classes', () => {
			const nth = buildTree({
				tag: 'html',
				children: [{ tag: 'body', children: [{ tag: 'div', classes: ['a:nth-of-type(2)', 'b'] }] }],
			});
			expect(generateUniqueSelector(find(nth, 'div')!)).toBe(String.raw`div.a\:nth-of-type\(2\).b`);
		});

		it('escapes an element name that ends with `:nth-of-type(n)`, before the position', () => {
			const nth = buildTree({
				tag: 'html',
				children: [
					{
						tag: 'body',
						children: [
							{
								tag: 'div',
								children: [{ tag: 'foo:nth-of-type(2)' }, { tag: 'foo:nth-of-type(2)' }],
							},
						],
					},
				],
			});
			const [, second] = [...find(nth, 'div')!.children];
			expect(generateUniqueSelector(second!)).toBe(String.raw`div > foo\:nth-of-type\(2\):nth-of-type(2)`);
		});

		it('escapes an element name that ends with `:nth-of-type(n)` in `tag[attr="value"]`', () => {
			const nth = buildTree({
				tag: 'html',
				children: [{ tag: 'body', children: [{ tag: 'foo:nth-of-type(2)', attrs: { role: 'x' } }] }],
			});
			expect(generateUniqueSelector(find(nth, 'foo:nth-of-type(2)')!)).toBe(
				String.raw`foo\:nth-of-type\(2\)[role="x"]`,
			);
		});

		it('writes the classes of Tailwind as `CSS.escape` does: a `:` and a leading digit', () => {
			const tailwind = buildTree({
				tag: 'html',
				children: [{ tag: 'body', children: [{ tag: 'div', classes: ['hover:bg-x', '2xl:flex'] }] }],
			});
			expect(generateUniqueSelector(find(tailwind, 'div')!)).toBe(String.raw`div.hover\:bg-x.\32 xl\:flex`);
		});

		it.each([
			['a b', String.raw`#a\ b`],
			['a > b', String.raw`#a\ \>\ b`],
			['a >', String.raw`#a\ \>`],
			[String.raw`a\b`, String.raw`#a\\b`],
			['a>b', String.raw`#a\>b`],
			['main-nav', '#main-nav'],
		])('writes the id %j as %s, so that the scope is not split at ` > `', (id, scope) => {
			const withId = buildTree({ tag: 'html', children: [{ tag: 'body', children: [{ tag: 'div', id }] }] });
			expect(generateUniqueSelector(find(withId, 'div')!)).toBe(scope);
		});

		it('writes the id of an ancestor escaped, in the path of its descendant', () => {
			const withId = buildTree({
				tag: 'html',
				children: [{ tag: 'body', children: [{ tag: 'div', id: 'a > b', children: [{ tag: 'p' }] }] }],
			});
			expect(generateUniqueSelector(find(withId, 'p')!)).toBe(String.raw`#a\ \>\ b > p`);
		});

		it('escapes a `\\` before the `:` of a class name that ends with `:nth-of-type(n)`, both of them', () => {
			const nth = buildTree({
				tag: 'html',
				children: [{ tag: 'body', children: [{ tag: 'div', classes: [String.raw`a\:nth-of-type(2)`] }] }],
			});
			expect(generateUniqueSelector(find(nth, 'div')!)).toBe(String.raw`div.a\\\:nth-of-type\(2\)`);
		});
	});

	// https://drafts.csswg.org/cssom/#serialize-an-identifier
	describe('serializeIdentifier', () => {
		it.each([
			['a', 'a'],
			['Tabs', 'Tabs'],
			['a-b_c9', 'a-b_c9'],
			['--a', '--a'],
			['-a', '-a'],
			['\u0000', '\uFFFD'],
			['\u0001\u0002\u001E\u001F', String.raw`\1 \2 \1e \1f `],
			['\u007F', String.raw`\7f `],
			['0a', String.raw`\30 a`],
			['9a', String.raw`\39 a`],
			['a0b', 'a0b'],
			['-0a', String.raw`-\30 a`],
			['-', String.raw`\-`],
			['--', '--'],
			['a b', String.raw`a\ b`],
			['a>b', String.raw`a\>b`],
			['a.b#c[d]', String.raw`a\.b\#c\[d\]`],
			['a:b(1)', String.raw`a\:b\(1\)`],
			['a"b=c', String.raw`a\"b\=c`],
			[String.raw`a\b`, String.raw`a\\b`],
			['日本語', '日本語'],
			['\u{1F600}', '\u{1F600}'],
			// U+0080 to U+00B6 and U+00D7 are not ident code points
			['\u0080', '\\\u0080'],
			['\u00D7', '\\\u00D7'],
		])('%j is written as %j', (name, expected) => {
			expect(serializeIdentifier(name)).toBe(expected);
		});
	});

	// https://www.w3.org/TR/css-syntax-3/#consume-escaped-code-point
	describe('unescapeIdentifier', () => {
		it.each([
			['a', 'a'],
			// Unescaped characters stay as they are: a file written before the escape holds them
			['hover:bg-x', 'hover:bg-x'],
			[String.raw`a\.b`, 'a.b'],
			[String.raw`a\:b`, 'a:b'],
			[String.raw`a\zb`, 'azb'],
			[String.raw`a\\b`, String.raw`a\b`],
			// 1 to 6 hex digits, and one whitespace that ends them
			[String.raw`\31 a`, '1a'],
			[String.raw`\31a`, '\u031A'],
			[String.raw`\000031a`, '1a'],
			['\\31\ta', '1a'],
			['\\31\na', '1a'],
			['\\31\r\na', '1a'],
			['\\31  a', '1 a'],
			[String.raw`\1F600 x`, '\u{1F600}x'],
			// Zero, a surrogate and a value over U+10FFFF are U+FFFD
			[String.raw`\0 a`, '\uFFFDa'],
			[String.raw`\d800 a`, '\uFFFDa'],
			[String.raw`\110000 a`, '\uFFFDa'],
			// A `\` at the end is U+FFFD, and a `\` before a newline is no escape
			['a\\', 'a\uFFFD'],
			['a\\\nb', 'a\\\nb'],
		])('%j is read as %j', (escaped, expected) => {
			expect(unescapeIdentifier(escaped)).toBe(expected);
		});
	});

	describe('findNodeAtPosition', () => {
		function pNode(tag: string, line: number, col: number, parent: ScopedNode | null = null): PositionedNode {
			return {
				nodeType: 1,
				localName: tag,
				id: '',
				classList: { contains: () => false, [Symbol.iterator]: function* () {} },
				attributes: [],
				parentElement: parent,
				children: [],
				startLine: line,
				startCol: col,
			};
		}

		it('finds element node at exact position', () => {
			const html = pNode('html', 1, 1);
			const div = pNode('div', 3, 5, html);
			const result = findNodeAtPosition([html, div], 3, 5);
			expect(result?.localName).toBe('div');
		});

		it('returns null when no node matches', () => {
			const html = pNode('html', 1, 1);
			expect(findNodeAtPosition([html], 99, 99)).toBeNull();
		});

		it('walks up to parent for non-element nodes', () => {
			const div = pNode('div', 2, 1);
			const attr: PositionedNode = {
				nodeType: 2, // attribute
				localName: 'class',
				id: '',
				classList: { contains: () => false, [Symbol.iterator]: function* () {} },
				attributes: [],
				parentElement: div,
				children: [],
				startLine: 2,
				startCol: 5,
			};
			const result = findNodeAtPosition([div, attr], 2, 5);
			expect(result?.localName).toBe('div');
		});
	});

	describe('computeScopeForViolations', () => {
		function pNode(
			tag: string,
			line: number,
			col: number,
			parent: ScopedNode | null = null,
			opts: { id?: string } = {},
		): PositionedNode {
			return {
				nodeType: 1,
				localName: tag,
				id: opts.id ?? '',
				classList: { contains: () => false, [Symbol.iterator]: function* () {} },
				attributes: [],
				parentElement: parent,
				children: [],
				startLine: line,
				startCol: col,
			};
		}

		function vio(line: number, col: number): Violation {
			return { ruleId: 'test', severity: 'error', message: '', line, col, raw: '' };
		}

		it('computes scope for violations in a subtree', () => {
			const html = pNode('html', 1, 1);
			const body = pNode('body', 1, 7, html);
			const nav = pNode('nav', 2, 1, body, { id: 'main' });
			const li = pNode('li', 3, 1, nav);

			const scope = computeScopeForViolations([html, body, nav, li], [vio(3, 1)]);
			// LCA of single node (li) → parent is nav → #main
			expect(scope).toBe('#main');
		});

		it('returns undefined for warning-only violations', () => {
			const html = pNode('html', 1, 1);
			const div = pNode('div', 2, 1, html);
			const warning: Violation = { ruleId: 'test', severity: 'warning', message: '', line: 2, col: 1, raw: '' };

			expect(computeScopeForViolations([html, div], [warning])).toBeUndefined();
		});

		it('returns undefined when no nodes found', () => {
			const html = pNode('html', 1, 1);
			expect(computeScopeForViolations([html], [vio(99, 99)])).toBeUndefined();
		});
	});

	describe('splitScopeAttr', () => {
		it.each([
			['div[role="x"]', 'div', 'role', 'x'],
			['Tabs.Root[role="x"]', 'Tabs.Root', 'role', 'x'],
			[String.raw`Tabs\.Root[role="x"]`, String.raw`Tabs\.Root`, 'role', 'x'],
			['main[role="a]b"]', 'main', 'role', 'a]b'],
			// An escaped `"`, `]` and `[` do not end the tag
			[String.raw`a\"b[role="x"]`, String.raw`a\"b`, 'role', 'x'],
			[String.raw`a\]b[role="x"]`, String.raw`a\]b`, 'role', 'x'],
			[String.raw`a\[b[role="x"]`, String.raw`a\[b`, 'role', 'x'],
		])('%s is a tag, an attribute and a value', (segment, tag, attrName, attrValue) => {
			expect(splitScopeAttr(segment)).toStrictEqual({ tag, attrName, attrValue });
		});

		it.each([
			'div',
			'div.a',
			// An escaped `[` is no attribute
			String.raw`Foo\[x="y"]`,
			// No tag
			'[role="x"]',
			// An unescaped `"` or `]` in the tag
			'a"b[role="x"]',
			'a]b[role="x"]',
			// An unescaped `[` that does not start an attribute
			'div.a[b][role="x"]',
			'div[role=x]',
			'div[Role="x"]',
			'div[role=""]',
		])('%s is no attribute', segment => {
			expect(splitScopeAttr(segment)).toBeNull();
		});
	});

	describe('splitScopeNth', () => {
		it.each([
			['div:nth-of-type(2)', 'div', 2],
			['div.a:nth-of-type(10)', 'div.a', 10],
			['div:nth-of-type(02)', 'div', 2],
			[':nth-of-type(2)', '', 2],
			[String.raw`a\\:nth-of-type(2)`, String.raw`a\\`, 2],
			[String.raw`foo\:nth-of-type(2):nth-of-type(3)`, String.raw`foo\:nth-of-type(2)`, 3],
			['a:nth-of-type(1):nth-of-type(2)', 'a:nth-of-type(1)', 2],
		])('%s is a position', (segment, base, nth) => {
			expect(splitScopeNth(segment)).toStrictEqual({ base, nth });
		});

		it.each([
			'div',
			String.raw`div.a\:nth-of-type(2)`,
			String.raw`a\\\:nth-of-type(2)`,
			'a:nth-of-type(2).b',
			'a:nth-of-type(x)',
		])('%s has no position', segment => {
			expect(splitScopeNth(segment)).toStrictEqual({ base: segment, nth: null });
		});
	});
});
