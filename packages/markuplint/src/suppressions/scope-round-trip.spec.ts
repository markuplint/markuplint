import type { Violation } from '@markuplint/ml-config';

import { describe, it, expect } from 'vitest';

import type { PositionedNode, ScopedNode } from './compute-scope.js';
import { applySuppressions } from './apply-suppressions.js';
import { generateUniqueSelector } from './compute-scope.js';

const suppressionsPath = '/project/markuplint-suppressions.json';
const file = '/project/src/a.tsx';

function element(tag: string, classes: readonly string[], parent: ScopedNode | null, id = ''): PositionedNode {
	const node = {
		nodeType: 1,
		localName: tag,
		id,
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

	it.each(['\\', '.', '#', '[', ':'].flatMap(char => [`a${char}b`, `a${char}`, `a${char}:nth-of-type(2)`]))(
		'a class %j that holds a character of the syntax of a scope',
		name => {
			expect(roundTrip(element('div', [name], div), element('div', ['a'], div))).toStrictEqual({
				own: true,
				other: false,
			});
		},
	);

	it.each(['a > b', 'a b', 'a >', String.raw`a\b`, String.raw`a\ b`, 'a>b'])(
		'`<div id=%j>`, not `<div id="a">`',
		id => {
			expect(roundTrip(element('div', [], div, id), element('div', [], div, 'a'))).toStrictEqual({
				own: true,
				other: false,
			});
		},
	);

	// Names that `CSS.escape` writes with an escape: a hex one, a whitespace, a syntax of a selector, or a code point out of the identifier
	const NAMES = [
		'2xl:flex',
		'-',
		'-1',
		'1 b',
		'a b',
		'a>b',
		'a"b=c',
		'a(1)',
		'\u0001a',
		'\u007Fa',
		'a\t b',
		'a\\',
		'\u0080a',
		'日本語',
		'\u{1F600}',
	];

	/** The name without its last code point: the element a reader that drops a part of a name would match. */
	const truncated = (name: string) => [...name].slice(0, -1).join('') || 'x';

	// A class cannot hold a whitespace in HTML, but the escape is the same for every name, so the names are shared.
	it.each(NAMES)('a class %j, not the class without its last character', name => {
		expect(roundTrip(element('div', [name], div), element('div', [truncated(name)], div))).toStrictEqual({
			own: true,
			other: false,
		});
	});

	it.each(NAMES)('an element named %j, not the name without its last character', name => {
		expect(roundTrip(element(name, [], div), element(truncated(name), [], div))).toStrictEqual({
			own: true,
			other: false,
		});
	});

	it.each(NAMES)('an id %j, not the id without its last character', name => {
		expect(roundTrip(element('div', [], div, name), element('div', [], div, truncated(name)))).toStrictEqual({
			own: true,
			other: false,
		});
	});

	it.each(['a > b', 'a >', '> b', '>'])('an ancestor whose id is %j, and whose descendant is the violation', id => {
		const parent = element('div', [], div, id);
		const child = element('p', [], parent);
		(parent as { children: Iterable<ScopedNode> }).children = [child];
		expect(roundTrip(child, element('p', [], element('div', [], div, 'a')))).toStrictEqual({
			own: true,
			other: false,
		});
	});

	it('an ancestor whose class ends with `:nth-of-type(n)`, and whose descendant is the violation', () => {
		const parent = element('div', ['a:nth-of-type(2)'], div);
		const child = element('p', [], parent);
		(parent as { children: Iterable<ScopedNode> }).children = [child];
		expect(generateUniqueSelector(child)).toBe(String.raw`div.a\:nth-of-type\(2\) > p`);
		expect(roundTrip(child, element('p', [], element('div', ['a'], div)))).toStrictEqual({
			own: true,
			other: false,
		});
	});

	it('`<div class="a:nth-of-type(2)">`, which is no `<div class="a">` at the position 2', () => {
		expect(roundTrip(element('div', ['a:nth-of-type(2)'], div), element('div', ['a'], div))).toStrictEqual({
			own: true,
			other: false,
		});
	});

	it('`<div class="a:nth-of-type(2) b">`, with another class after it', () => {
		expect(
			roundTrip(element('div', ['a:nth-of-type(2)', 'b'], div), element('div', ['a', 'b'], div)),
		).toStrictEqual({ own: true, other: false });
	});

	it('`<div class="hover:bg-x">`, whose `:` is not a position', () => {
		expect(roundTrip(element('div', ['hover:bg-x'], div), element('div', ['hover'], div))).toStrictEqual({
			own: true,
			other: false,
		});
	});

	it('the second of two `<foo\\>` siblings, whose `\\` ends the name before the position `:nth-of-type(2)`', () => {
		const parent = element('div', [], null);
		const first = element('foo\\', [], parent);
		const second = element('foo\\', [], parent);
		(parent as { children: Iterable<ScopedNode> }).children = [first, second];
		expect(generateUniqueSelector(second)).toBe(String.raw`div > foo\\:nth-of-type(2)`);
		expect(roundTrip(second, first)).toStrictEqual({ own: true, other: false });
	});

	it('the second of two `<foo:nth-of-type(2)>` siblings, through `:nth-of-type`', () => {
		const parent = element('div', [], null);
		const first = element('foo:nth-of-type(2)', [], parent);
		const second = element('foo:nth-of-type(2)', [], parent);
		(parent as { children: Iterable<ScopedNode> }).children = [first, second];
		expect(generateUniqueSelector(second)).toBe(String.raw`div > foo\:nth-of-type\(2\):nth-of-type(2)`);
		expect(roundTrip(second, first)).toStrictEqual({ own: true, other: false });
	});

	it('`<foo:nth-of-type(2)>`, which is no `<foo>` at the position 2', () => {
		const parent = element('div', [], null);
		const first = element('foo', [], parent);
		const second = element('foo', [], parent);
		const nth = element('foo:nth-of-type(2)', [], parent);
		(parent as { children: Iterable<ScopedNode> }).children = [first, second, nth];
		expect(roundTrip(nth, second)).toStrictEqual({ own: true, other: false });
	});
});

describe('a scope written before the escape', () => {
	const div = element('div', [], element('main', [], null));

	/** Whether the entry with the scope is used by a violation at `target`. */
	function isUsed(scope: string, target: PositionedNode) {
		const violation: Violation = { ruleId: 'rule-a', severity: 'error', message: 'm', line: 2, col: 1, raw: '' };
		return (
			applySuppressions(
				new Map([[file, [violation]]]),
				{ 'src/a.tsx': { 'rule-a': { count: 1, scope } } },
				suppressionsPath,
				{ nodeLists: new Map([[file, [target]]]) },
			).unusedEntries.length === 0
		);
	}

	it.each([
		['div.hover:bg-x', element('div', ['hover:bg-x'], div)],
		['div.2xl:flex', element('div', ['2xl:flex'], div)],
		['div.a.b', element('div', ['a', 'b'], div)],
		['#a b', element('div', [], div, 'a b')],
		['#a-b', element('div', [], div, 'a-b')],
	])('%s still matches the element it was made for', (scope, target) => {
		expect(isUsed(scope, target)).toBe(true);
	});

	it('reads `div.a:nth-of-type(2)` as the class `a` at the position 2, which never matched a class `a:nth-of-type(2)`', () => {
		const parent = element('div', [], null);
		const first = element('div', ['a'], parent);
		const second = element('div', ['a'], parent);
		const named = element('div', ['a:nth-of-type(2)'], parent);
		(parent as { children: Iterable<ScopedNode> }).children = [first, second, named];
		expect(isUsed('div.a:nth-of-type(2)', second)).toBe(true);
		expect(isUsed('div.a:nth-of-type(2)', first)).toBe(false);
		expect(isUsed('div.a:nth-of-type(2)', named)).toBe(false);
	});
});
