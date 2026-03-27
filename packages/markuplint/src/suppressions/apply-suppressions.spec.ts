import type { Violation } from '@markuplint/ml-config';

import { describe, it, expect } from 'vitest';

import type { PositionedNode, ScopedNode } from './compute-scope.js';
import { applySuppressions } from './apply-suppressions.js';

function v(ruleId: string, severity: 'error' | 'warning' | 'info' = 'error', line = 1, col = 1): Violation {
	return { ruleId, severity, message: 'test', line, col, raw: '' };
}

function pNode(
	tag: string,
	line: number,
	col: number,
	parent: ScopedNode | null = null,
	opts: { id?: string; classes?: readonly string[] } = {},
): PositionedNode {
	return {
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
}

describe('applySuppressions', () => {
	const suppressionsPath = '/project/markuplint-suppressions.json';

	it('suppresses all errors when count <= suppressed count', () => {
		const violations = new Map<string, Violation[]>([['/project/src/a.html', [v('rule-a'), v('rule-a')]]]);
		const suppressions = {
			'src/a.html': { 'rule-a': { count: 3 } },
		};

		const { filtered } = applySuppressions(violations, suppressions, suppressionsPath);
		expect(filtered.get('/project/src/a.html')).toStrictEqual([]);
	});

	it('reports ALL violations when count > suppressed count', () => {
		const violations = new Map<string, Violation[]>([
			['/project/src/a.html', [v('rule-a'), v('rule-a'), v('rule-a')]],
		]);
		const suppressions = {
			'src/a.html': { 'rule-a': { count: 2 } },
		};

		const { filtered } = applySuppressions(violations, suppressions, suppressionsPath);
		expect(filtered.get('/project/src/a.html')).toHaveLength(3);
	});

	it('passes through warning and info violations', () => {
		const violations = new Map<string, Violation[]>([
			['/project/src/a.html', [v('rule-a', 'error'), v('rule-b', 'warning'), v('rule-c', 'info')]],
		]);
		const suppressions = {
			'src/a.html': { 'rule-a': { count: 1 } },
		};

		const { filtered } = applySuppressions(violations, suppressions, suppressionsPath);
		const result = filtered.get('/project/src/a.html')!;
		expect(result).toHaveLength(2);
		expect(result[0]!.severity).toBe('warning');
		expect(result[1]!.severity).toBe('info');
	});

	it('passes through violations for files not in suppressions', () => {
		const violations = new Map<string, Violation[]>([['/project/src/unknown.html', [v('rule-a')]]]);

		const { filtered } = applySuppressions(violations, {}, suppressionsPath);
		expect(filtered.get('/project/src/unknown.html')).toHaveLength(1);
	});

	it('passes through violations for rules not in suppressions', () => {
		const violations = new Map<string, Violation[]>([['/project/src/a.html', [v('rule-unknown')]]]);
		const suppressions = {
			'src/a.html': { 'rule-a': { count: 1 } },
		};

		const { filtered } = applySuppressions(violations, suppressions, suppressionsPath);
		expect(filtered.get('/project/src/a.html')).toHaveLength(1);
	});

	it('detects unused suppression entries', () => {
		const violations = new Map<string, Violation[]>([['/project/src/a.html', [v('rule-a')]]]);
		const suppressions = {
			'src/a.html': { 'rule-a': { count: 1 }, 'rule-b': { count: 2 } },
			'src/deleted.html': { 'rule-c': { count: 1 } },
		};

		const { unusedEntries } = applySuppressions(violations, suppressions, suppressionsPath);
		expect(unusedEntries).toContain('src/a.html:rule-b');
		expect(unusedEntries).toContain('src/deleted.html:rule-c');
		expect(unusedEntries).not.toContain('src/a.html:rule-a');
	});

	it('handles mixed scenario: one suppressed, one over limit, one unknown', () => {
		const violations = new Map<string, Violation[]>([
			['/project/src/a.html', [v('rule-a'), v('rule-a'), v('rule-b'), v('rule-b'), v('rule-b'), v('rule-c')]],
		]);
		const suppressions = {
			'src/a.html': {
				'rule-a': { count: 2 }, // exact match → suppressed
				'rule-b': { count: 1 }, // exceeded → all reported
			},
		};

		const { filtered } = applySuppressions(violations, suppressions, suppressionsPath);
		const result = filtered.get('/project/src/a.html')!;

		// rule-a: 2 violations, count=2 → suppressed (0 remaining)
		// rule-b: 3 violations, count=1 → all 3 reported
		// rule-c: 1 violation, not in suppressions → reported
		expect(result).toHaveLength(4);
		expect(result.filter(r => r.ruleId === 'rule-a')).toHaveLength(0);
		expect(result.filter(r => r.ruleId === 'rule-b')).toHaveLength(3);
		expect(result.filter(r => r.ruleId === 'rule-c')).toHaveLength(1);
	});

	describe('with scope', () => {
		it('only counts violations within scope when nodeList is provided', () => {
			// Tree: html > body > nav#main > ul > li (line 3) + li (line 4)
			//                   > footer > li (line 6)
			const html = pNode('html', 1, 1);
			const body = pNode('body', 1, 7, html);
			const nav = pNode('nav', 2, 1, body, { id: 'main' });
			const ul = pNode('ul', 2, 10, nav);
			const li1 = pNode('li', 3, 1, ul);
			const li2 = pNode('li', 4, 1, ul);
			const footer = pNode('footer', 5, 1, body);
			const li3 = pNode('li', 6, 1, footer);

			const nodeList: PositionedNode[] = [html, body, nav, ul, li1, li2, footer, li3];
			const nodeLists = new Map([['/project/src/a.html', nodeList as readonly PositionedNode[]]]);

			// 3 violations total, but scope #main > ul means only 2 are in scope
			const violations = new Map<string, Violation[]>([
				[
					'/project/src/a.html',
					[v('rule-a', 'error', 3, 1), v('rule-a', 'error', 4, 1), v('rule-a', 'error', 6, 1)],
				],
			]);
			const suppressions = {
				'src/a.html': { 'rule-a': { count: 2, scope: '#main > ul' } },
			};

			const { filtered } = applySuppressions(violations, suppressions, suppressionsPath, { nodeLists });
			// 2 in scope <= count 2 → those 2 suppressed (line 3, 4)
			// 1 outside scope (line 6, footer) → passes through
			const result = filtered.get('/project/src/a.html')!;
			expect(result).toHaveLength(1);
			expect(result[0]!.line).toBe(6); // the one in footer
		});

		it('reports all when scoped count exceeds suppressed count', () => {
			const html = pNode('html', 1, 1);
			const body = pNode('body', 1, 7, html);
			const nav = pNode('nav', 2, 1, body, { id: 'main' });
			const li1 = pNode('li', 3, 1, nav);
			const li2 = pNode('li', 4, 1, nav);
			const li3 = pNode('li', 5, 1, nav);

			const nodeList: PositionedNode[] = [html, body, nav, li1, li2, li3];
			const nodeLists = new Map([['/project/src/a.html', nodeList as readonly PositionedNode[]]]);

			const violations = new Map<string, Violation[]>([
				[
					'/project/src/a.html',
					[v('rule-a', 'error', 3, 1), v('rule-a', 'error', 4, 1), v('rule-a', 'error', 5, 1)],
				],
			]);
			const suppressions = {
				'src/a.html': { 'rule-a': { count: 2, scope: '#main' } },
			};

			const { filtered } = applySuppressions(violations, suppressions, suppressionsPath, { nodeLists });
			// 3 in scope > count 2 → all reported
			expect(filtered.get('/project/src/a.html')).toHaveLength(3);
		});

		it('ignores scope when nodeLists are not provided (Phase 1 compatible)', () => {
			const violations = new Map<string, Violation[]>([['/project/src/a.html', [v('rule-a'), v('rule-a')]]]);
			const suppressions = {
				'src/a.html': { 'rule-a': { count: 2, scope: '#main' } },
			};

			// No nodeLists → scope ignored, file-level count used
			const { filtered } = applySuppressions(violations, suppressions, suppressionsPath);
			expect(filtered.get('/project/src/a.html')).toStrictEqual([]);
		});
	});
});
