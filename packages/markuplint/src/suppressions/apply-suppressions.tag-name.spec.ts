import type { Violation } from '@markuplint/ml-config';

import { describe, it, expect } from 'vitest';

import type { PositionedNode } from './compute-scope.js';
import { applySuppressions } from './apply-suppressions.js';

const suppressionsPath = '/project/markuplint-suppressions.json';
const file = '/project/src/a.vue';

function violation(line: number, col: number): Violation {
	return { ruleId: 'rule-a', severity: 'error', message: 'test', line, col, raw: '' };
}

/** A node whose tree a spec builds: the parent and the children are set after it is made. */
type MutableNode = { -readonly [K in keyof PositionedNode]: PositionedNode[K] };

function element(
	tag: string,
	line: number,
	col: number,
	attributes: readonly { name: string; value: string }[] = [],
	classes: readonly string[] = [],
): MutableNode {
	return {
		nodeType: 1,
		localName: tag,
		id: '',
		classList: {
			contains: (cls: string) => classes.includes(cls),
			[Symbol.iterator]: function* () {
				yield* classes;
			},
		},
		attributes: attributes.map(({ name, value }) => ({ name, value })),
		parentElement: null,
		children: [],
		startLine: line,
		startCol: col,
	} as unknown as MutableNode;
}

/** Whether the violation of the element is suppressed by the scope. */
function isSuppressed(scope: string, tag: string, attributes: readonly { name: string; value: string }[] = []) {
	const { filtered } = applySuppressions(
		new Map([[file, [violation(1, 1)]]]),
		{ 'src/a.vue': { 'rule-a': { count: 1, scope } } },
		suppressionsPath,
		{ nodeLists: new Map([[file, [element(tag, 1, 1, attributes)]]]) },
	);
	return filtered.get(file)?.length === 0;
}

describe('a scope of the form tag[attr="value"]', () => {
	it.each([
		['main[role="main"]', 'main', 'role', 'main'],
		// The name of a component has a capital letter, and the name of an element a digit
		['FooBar[role="x"]', 'FooBar', 'role', 'x'],
		['fooBar[role="x"]', 'fooBar', 'role', 'x'],
		['h1[role="heading"]', 'h1', 'role', 'heading'],
		['Tabs2[role="tablist"]', 'Tabs2', 'role', 'tablist'],
		['foo-bar[role="x"]', 'foo-bar', 'role', 'x'],
	])('%s matches the element it was made for', (scope, tag, attrName, attrValue) => {
		expect(isSuppressed(scope, tag, [{ name: attrName, value: attrValue }])).toBe(true);
	});

	it('does not match an element of another name', () => {
		expect(isSuppressed('FooBar[role="x"]', 'FooBaz', [{ name: 'role', value: 'x' }])).toBe(false);
		expect(isSuppressed('FooBar[role="x"]', 'foobar', [{ name: 'role', value: 'x' }])).toBe(false);
	});

	it('does not match an element with another value of the attribute', () => {
		expect(isSuppressed('FooBar[role="x"]', 'FooBar', [{ name: 'role', value: 'y' }])).toBe(false);
	});
});

describe('a scope that names an element whose name has a `.`', () => {
	it.each([
		[String.raw`Tabs\.Root`, 'Tabs.Root'],
		[String.raw`Tabs\.Root[role="x"]`, 'Tabs.Root'],
	])('%s matches the element it was made for', (scope, tag) => {
		expect(isSuppressed(scope, tag, [{ name: 'role', value: 'x' }])).toBe(true);
	});

	it('does not match an element of the name before the `.` or of a longer name', () => {
		expect(isSuppressed(String.raw`Tabs\.Root`, 'Tabs')).toBe(false);
		expect(isSuppressed(String.raw`Tabs\.Root`, 'Tabs.Rootx')).toBe(false);
	});

	it('reads the `\\ba` of `Foo\\bar` as a hex escape, and an escaped `\\` as a part of the name', () => {
		expect(isSuppressed(String.raw`Foo\bar`, 'Fooºr')).toBe(true);
		expect(isSuppressed(String.raw`Foo\\bar`, String.raw`Foo\bar`)).toBe(true);
	});

	it('keeps reading an unescaped `.` as the start of a class', () => {
		expect(isSuppressed('div.active', 'div')).toBe(false);
		// A scope written before the escape for `<Tabs.Root>` never matched it
		expect(isSuppressed('Tabs.Root', 'Tabs.Root')).toBe(false);
	});

	it('keeps matching a scope written before the escape in the form `tag[attr="value"]`', () => {
		expect(isSuppressed('Tabs.Root[role="x"]', 'Tabs.Root', [{ name: 'role', value: 'x' }])).toBe(true);
	});

	it.each([
		[String.raw`\#jsx-fragment`, '#jsx-fragment'],
		[String.raw`\#jsx-fragment[role="x"]`, '#jsx-fragment'],
		[String.raw`Foo\[x]`, 'Foo[x]'],
		[String.raw`Foo\\\.bar`, String.raw`Foo\.bar`],
	])('%s is the name %s', (scope, tag) => {
		expect(isSuppressed(scope, tag, [{ name: 'role', value: 'x' }])).toBe(true);
	});

	it('reads an escaped `[` as a part of the name, not as the start of an attribute', () => {
		expect(isSuppressed(String.raw`Foo\[role="x"]`, 'Foo', [{ name: 'role', value: 'x' }])).toBe(false);
	});

	it('holds a value that has `]` or `\\` in `tag[attr="value"]`', () => {
		expect(isSuppressed('main[role="a]b"]', 'main', [{ name: 'role', value: 'a]b' }])).toBe(true);
		expect(isSuppressed(String.raw`main[role="a\b"]`, 'main', [{ name: 'role', value: String.raw`a\b` }])).toBe(
			true,
		);
	});
});

describe('a scope that names an element with the escapes of CSS', () => {
	it.each([
		[String.raw`foo\:nth-of-type(2)`, 'foo:nth-of-type(2)'],
		[String.raw`foo\:nth-of-type(2)[role="x"]`, 'foo:nth-of-type(2)'],
		// `\:` is `:` wherever it is, as in CSS
		[String.raw`Foo\:bar`, 'Foo:bar'],
		[String.raw`Foo\:nth-of-type(x)`, 'Foo:nth-of-type(x)'],
		// An escaped `\` before the `[` of an attribute
		[String.raw`foo\\[role="x"]`, 'foo\\'],
		// A hex escape, and the whitespace that ends it
		[String.raw`\31 a`, '1a'],
		[String.raw`\31 a[role="x"]`, '1a'],
		[String.raw`Foo\ba`, 'Fooº'],
		[String.raw`Foo\3a bar`, 'Foo:bar'],
	])('%s is the name %j', (scope, tag) => {
		expect(isSuppressed(scope, tag, [{ name: 'role', value: 'x' }])).toBe(true);
	});

	it('reads `\\ba` as the hex escape U+00BA, as CSS does, not as a `\\` and `ba`', () => {
		expect(isSuppressed(String.raw`Foo\ba`, String.raw`Foo\ba`)).toBe(false);
	});

	it('does not read the escaped name as a position of the name before it', () => {
		expect(isSuppressed(String.raw`foo\:nth-of-type(2)`, 'foo')).toBe(false);
	});

	it('keeps reading an unescaped trailing `:nth-of-type(n)` as a position, not as a name', () => {
		expect(isSuppressed('foo:nth-of-type(2)', 'foo:nth-of-type(2)')).toBe(false);
	});
});

describe('a scope that names an element whose name has a capital letter or a digit, with a class or a position', () => {
	function node(tag: string, line: number, classes: readonly string[] = []) {
		return element(tag, line, 1, [], classes);
	}

	/** Whether the violation of `target`, one of `children` of a `div`, is suppressed by the scope. */
	function isSuppressedAmong(scope: string, children: readonly MutableNode[], target: MutableNode) {
		const parent = node('div', 1);
		parent.children = children;
		for (const child of children) {
			child.parentElement = parent;
		}
		const { filtered } = applySuppressions(
			new Map([[file, [violation(target.startLine, 1)]]]),
			{ 'src/a.vue': { 'rule-a': { count: 1, scope } } },
			suppressionsPath,
			{ nodeLists: new Map([[file, [parent, ...children]]]) },
		);
		return filtered.get(file)?.length === 0;
	}

	it.each([
		['FooBar.cls', 'FooBar'],
		['fooBar.cls', 'fooBar'],
		['h1.cls', 'h1'],
		['Tabs2.cls', 'Tabs2'],
	])('%s matches the element of the class', (scope, tag) => {
		const target = node(tag, 2, ['cls']);
		expect(isSuppressedAmong(scope, [target], target)).toBe(true);
	});

	it.each([
		['FooBar.cls', 'FooBar', ['other']],
		['FooBar.cls', 'foobar', ['cls']],
		['h1.cls', 'h1', []],
		['h1.cls', 'h2', ['cls']],
	] as const)('%s does not match <%s> of the classes %j', (scope, tag, classes) => {
		const target = node(tag, 2, classes);
		expect(isSuppressedAmong(scope, [target], target)).toBe(false);
	});

	it.each([
		['h1:nth-of-type(2)', 'h1'],
		['FooBar:nth-of-type(2)', 'FooBar'],
		['Tabs2:nth-of-type(2)', 'Tabs2'],
		['FooBar.cls:nth-of-type(2)', 'FooBar'],
	])('%s matches the second element of the name, not the first', (scope, tag) => {
		const first = node(tag, 2, ['cls']);
		const second = node(tag, 3, ['cls']);
		expect(isSuppressedAmong(scope, [first, second], second)).toBe(true);
		expect(isSuppressedAmong(scope, [first, second], first)).toBe(false);
	});

	it('counts the position among the elements of the same name only', () => {
		const heading2 = node('h2', 2);
		const firstH1 = node('h1', 3);
		const secondH1 = node('h1', 4);
		expect(isSuppressedAmong('h1:nth-of-type(2)', [heading2, firstH1, secondH1], secondH1)).toBe(true);
		expect(isSuppressedAmong('h1:nth-of-type(2)', [heading2, firstH1, secondH1], firstH1)).toBe(false);
	});

	it('does not count an element whose name differs only in case', () => {
		const lowercase = node('foobar', 2);
		const component = node('FooBar', 3);
		expect(isSuppressedAmong('FooBar:nth-of-type(2)', [lowercase, component], component)).toBe(false);
	});
});
