import type { Violation } from '@markuplint/ml-config';

import { describe, it, expect } from 'vitest';

import type { PositionedNode, ScopedNode } from './compute-scope.js';
import { applySuppressions } from './apply-suppressions.js';
import { generateUniqueSelector } from './compute-scope.js';

const suppressionsPath = '/project/markuplint-suppressions.json';
const file = '/project/src/a.tsx';

function element(tag: string, classes: readonly string[], parent: ScopedNode | null): PositionedNode {
	const node = {
		nodeType: 1,
		localName: tag,
		id: '',
		classList: {
			contains: (cls: string) => classes.includes(cls),
			[Symbol.iterator]: function* () {
				yield* classes;
			},
		},
		attributes: [],
		parentElement: parent,
		children: [],
		startLine: 2,
		startCol: 1,
	};
	return node as unknown as PositionedNode;
}

/** Whether the scope written for `node` suppresses a violation at `node`, and at `other`. */
function roundTrip(node: PositionedNode, other: PositionedNode) {
	const scope = generateUniqueSelector(node)!;
	const violation: Violation = { ruleId: 'rule-a', severity: 'error', message: 'm', line: 2, col: 1, raw: '' };
	const isUsed = (target: PositionedNode) =>
		applySuppressions(
			new Map([[file, [violation]]]),
			{ 'src/a.tsx': { 'rule-a': { count: 1, scope } } },
			suppressionsPath,
			{ nodeLists: new Map([[file, [target]]]) },
		).unusedEntries.length === 0;
	return { own: isUsed(node), other: isUsed(other) };
}

describe('the scope written by --suppress is read back as the element it was made for', () => {
	const div = element('div', [], element('main', [], null));

	it('`<Tabs.Root>` under a div, not `<Tabs class="Root">`', () => {
		expect(roundTrip(element('Tabs.Root', [], div), element('Tabs', ['Root'], div))).toStrictEqual({
			own: true,
			other: false,
		});
	});

	it('`<Tabs.Root class="active">`', () => {
		expect(
			roundTrip(element('Tabs.Root', ['active'], div), element('Tabs', ['Root', 'active'], div)),
		).toStrictEqual({ own: true, other: false });
	});

	it('`<Tabs class="Root">`, not `<Tabs.Root>`', () => {
		expect(roundTrip(element('Tabs', ['Root'], div), element('Tabs.Root', [], div))).toStrictEqual({
			own: true,
			other: false,
		});
	});

	it('the second of two `<Tabs.Root>` siblings, through `:nth-of-type`', () => {
		const parent = element('div', [], null);
		const first = element('Tabs.Root', [], parent);
		const second = element('Tabs.Root', [], parent);
		(parent as { children: Iterable<ScopedNode> }).children = [first, second];
		expect(generateUniqueSelector(second)).toBe(String.raw`div > Tabs\.Root:nth-of-type(2)`);
		expect(roundTrip(second, first)).toStrictEqual({ own: true, other: false });
	});

	it('a fragment, whose name `#jsx-fragment` is no id', () => {
		expect(roundTrip(element('#jsx-fragment', [], div), element('div', [], div))).toStrictEqual({
			own: true,
			other: false,
		});
	});

	it('`<div class="group-[x=\\"y\\"]">`, which is no `div[x="y"]`', () => {
		expect(roundTrip(element('div', ['group-[x="y"]'], div), element('div', ['group-'], div))).toStrictEqual({
			own: true,
			other: false,
		});
	});

	it('`<div class="py-1.5">`, not `<div class="py-1 5">`', () => {
		expect(roundTrip(element('div', ['py-1.5'], div), element('div', ['py-1', '5'], div))).toStrictEqual({
			own: true,
			other: false,
		});
	});
});
