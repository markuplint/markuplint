import type { Violation } from '@markuplint/ml-config';

import { describe, it, expect } from 'vitest';

import type { PositionedNode, ScopedNode } from './compute-scope.js';
import { generateSuppressions } from './generate-suppressions.js';

function v(ruleId: string, severity: 'error' | 'warning' | 'info' = 'error', line = 1, col = 1): Violation {
	return { ruleId, severity, message: 'test', line, col, raw: '' };
}

/** Build a minimal positioned node for testing. */
function pNode(
	tag: string,
	line: number,
	col: number,
	parent: ScopedNode | null = null,
	opts: { id?: string; classes?: readonly string[] } = {},
): PositionedNode {
	const node: PositionedNode = {
		nodeType: 1,
		localName: tag,
		id: opts.id ?? '',
		classList: {
			contains: (cls: string) => opts.classes?.includes(cls) ?? false,
			[Symbol.iterator]: function* () {
				if (opts.classes) yield* opts.classes;
			},
		},
		attributes: [],
		parentElement: parent,
		children: [],
		startLine: line,
		startCol: col,
	};
	return node;
}

describe('generateSuppressions', () => {
	const suppressionsPath = '/project/markuplint-suppressions.json';

	it('counts error violations per file and rule', () => {
		const map = new Map<string, Violation[]>([
			['/project/src/a.html', [v('rule-a'), v('rule-a'), v('rule-b')]],
			['/project/src/b.html', [v('rule-c')]],
		]);

		const result = generateSuppressions(map, suppressionsPath);
		expect(result).toStrictEqual({
			'src/a.html': {
				'rule-a': { count: 2 },
				'rule-b': { count: 1 },
			},
			'src/b.html': {
				'rule-c': { count: 1 },
			},
		});
	});

	it('ignores warning and info violations', () => {
		const map = new Map<string, Violation[]>([
			['/project/src/a.html', [v('rule-a', 'error'), v('rule-b', 'warning'), v('rule-c', 'info')]],
		]);

		const result = generateSuppressions(map, suppressionsPath);
		expect(result).toStrictEqual({
			'src/a.html': {
				'rule-a': { count: 1 },
			},
		});
	});

	it('filters by specific rule when filterRule is provided', () => {
		const map = new Map<string, Violation[]>([['/project/src/a.html', [v('rule-a'), v('rule-a'), v('rule-b')]]]);

		const result = generateSuppressions(map, suppressionsPath, { filterRule: 'rule-a' });
		expect(result).toStrictEqual({
			'src/a.html': {
				'rule-a': { count: 2 },
			},
		});
	});

	it('returns empty object when no error violations exist', () => {
		const map = new Map<string, Violation[]>([['/project/src/a.html', [v('rule-a', 'warning')]]]);

		const result = generateSuppressions(map, suppressionsPath);
		expect(result).toStrictEqual({});
	});

	it('returns empty object for empty input', () => {
		const result = generateSuppressions(new Map(), suppressionsPath);
		expect(result).toStrictEqual({});
	});

	describe('with nodeLists (scope computation)', () => {
		it('generates scope when nodeLists are provided', () => {
			// Build: html > body > nav#main > ul > li (line 3, col 1)
			const html = pNode('html', 1, 1);
			const body = pNode('body', 1, 7, html);
			const nav = pNode('nav', 2, 1, body, { id: 'main' });
			const ul = pNode('ul', 2, 10, nav);
			const li = pNode('li', 3, 1, ul);

			const nodeList: PositionedNode[] = [html, body, nav, ul, li];
			const nodeLists = new Map<string, readonly PositionedNode[]>([['/project/src/a.html', nodeList]]);

			const violations = new Map<string, Violation[]>([['/project/src/a.html', [v('rule-a', 'error', 3, 1)]]]);

			const result = generateSuppressions(violations, suppressionsPath, { nodeLists });
			const entry = result['src/a.html']?.['rule-a'];
			expect(entry?.count).toBe(1);
			// LCA of single node (li) → parent is ul → selector uses id ancestor
			expect(entry?.scope).toBeDefined();
		});

		it('omits scope when nodeLists are not provided (Phase 1 compatible)', () => {
			const violations = new Map<string, Violation[]>([['/project/src/a.html', [v('rule-a')]]]);

			const result = generateSuppressions(violations, suppressionsPath);
			const entry = result['src/a.html']?.['rule-a'];
			expect(entry?.count).toBe(1);
			expect(entry?.scope).toBeUndefined();
		});

		it('omits scope when LCA falls back to file-level', () => {
			// Two nodes under body → LCA is body → file-level fallback
			const html = pNode('html', 1, 1);
			const body = pNode('body', 1, 7, html);
			const nav = pNode('nav', 2, 1, body);
			const footer = pNode('footer', 5, 1, body);

			const nodeList: PositionedNode[] = [html, body, nav, footer];
			const nodeLists = new Map<string, readonly PositionedNode[]>([['/project/src/a.html', nodeList]]);

			const violations = new Map<string, Violation[]>([
				['/project/src/a.html', [v('rule-a', 'error', 2, 1), v('rule-a', 'error', 5, 1)]],
			]);

			const result = generateSuppressions(violations, suppressionsPath, { nodeLists });
			const entry = result['src/a.html']?.['rule-a'];
			expect(entry?.count).toBe(2);
			expect(entry?.scope).toBeUndefined();
		});
	});
});
