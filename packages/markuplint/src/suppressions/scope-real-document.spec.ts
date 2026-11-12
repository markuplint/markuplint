import type { PositionedNode } from './compute-scope.js';
import type { Rules, Violation } from '@markuplint/ml-config';

import { describe, it, expect } from 'vitest';

import { MLEngine } from '../api/index.js';

import { applySuppressions } from './apply-suppressions.js';
import { computeScopeForViolations, findNodeAtPosition } from './compute-scope.js';

/**
 * The scope of the violations of a document the parsers really produce, and whether that scope
 * suppresses them again. The node list is read the way `command.ts` reads it: `MLDocument#nodeList`
 * cast to `PositionedNode`, so these also pin the names of the position fields the cast relies on.
 */
async function lint(code: string, rules: Rules, parser?: string) {
	const engine = await MLEngine.fromCode(code, {
		name: parser ? 'a.jsx' : 'a.html',
		config: { rules, ...(parser ? { parser: { '.*': parser } } : {}) },
	});
	const result = await engine.exec();
	const nodeList = engine.document!.nodeList as unknown as PositionedNode[];
	const violations: readonly Violation[] = result!.violations.filter(v => v.severity === 'error');
	const scope = computeScopeForViolations(nodeList, violations);
	const suppressionsPath = '/project/markuplint-suppressions.json';
	const file = '/project/a.html';
	const { filtered } = applySuppressions(
		new Map([[file, violations]]),
		{
			'a.html': {
				[violations[0]!.ruleId]: scope ? { count: violations.length, scope } : { count: violations.length },
			},
		},
		suppressionsPath,
		{ nodeLists: new Map([[file, nodeList]]) },
	);
	return {
		scope,
		positions: violations.map(v => [v.line, v.col]),
		suppressed: filtered.get(file)!.length === 0,
		nodeAt: (line: number, col: number) => findNodeAtPosition(nodeList, line, col)?.localName ?? null,
	};
}

describe('the scope of the violations of a real document', () => {
	it('an attribute is in the scope of its element', async () => {
		const r = await lint('<div id="a"><p class="x" class="y">a</p><p class="z" class="w">b</p></div>\n<p>c</p>', {
			'no-duplicate-attr': true,
		});
		expect(r.positions).toStrictEqual([
			[1, 26],
			[1, 54],
		]);
		expect(r.scope).toBe('#a');
		expect(r.suppressed).toBe(true);
	});

	it('an end tag is in the scope of its element', async () => {
		const r = await lint('<div id="a"><P>x</P></div>\n<p>c</p>', {
			'case-sensitive-tag-name': { severity: 'error' },
		});
		expect(r.positions).toStrictEqual([
			[1, 14],
			[1, 17],
		]);
		expect(r.scope).toBe('#a > p');
		expect(r.suppressed).toBe(true);
	});

	it('an element nested in a JSX expression is itself, not the element around the block', async () => {
		const r = await lint(
			'<main><div id="r">{x && <p class="a" class="b">t</p>}</div><div id="s"></div></main>',
			{ 'no-duplicate-attr': true },
			'@markuplint/jsx-parser',
		);
		expect(r.nodeAt(1, 37)).toBe('p');
		expect(r.scope).toBe('#r');
		expect(r.suppressed).toBe(true);
	});

	it('an omitted element does not hide the element at its start', async () => {
		const r = await lint('<table><tr><td class="a" class="b">t</td></tr></table>', { 'no-duplicate-attr': true });
		expect(r.nodeAt(1, 8)).toBe('tr');
		expect(r.scope).toBe('table > tbody > tr');
		expect(r.suppressed).toBe(true);
	});

	it('a position on the first line of a start tag that spans lines, after the column its end is at', async () => {
		const r = await lint('<div id="a"><p class="aaaaaaaa"\n class="b">t</p></div>', { 'no-duplicate-attr': true });
		expect(r.positions).toStrictEqual([[2, 2]]);
		expect(r.nodeAt(1, 20)).toBe('p');
		expect(r.scope).toBe('#a');
		expect(r.suppressed).toBe(true);
	});

	it('a violation at the doctype, which is in no element, leaves the entry without a scope', async () => {
		const r = await lint(
			'<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN">\n<html><body><div id="a"></div></body></html>',
			{ doctype: { severity: 'error' } },
		);
		expect(r.positions).toStrictEqual([[1, 1]]);
		expect(r.nodeAt(1, 1)).toBeNull();
		expect(r.scope).toBeUndefined();
		expect(r.suppressed).toBe(true);
	});
});
