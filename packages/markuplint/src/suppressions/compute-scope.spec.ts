import { describe, it, expect } from 'vitest';

import type { Violation } from '@markuplint/ml-config';

import type { PositionedNode, ScopedNode } from './compute-scope.js';
import {
	getAncestorChain,
	computeLCA,
	generateUniqueSelector,
	findNodeAtPosition,
	computeScopeForViolations,
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
});
