import type { Violation } from '@markuplint/ml-config';

import { describe, it, expect } from 'vitest';

import type { PositionedNode } from './compute-scope.js';
import { applySuppressions } from './apply-suppressions.js';

const suppressionsPath = '/project/markuplint-suppressions.json';
const file = '/project/src/a.vue';

function violation(line: number, col: number): Violation {
	return { ruleId: 'rule-a', severity: 'error', message: 'test', line, col, raw: '' };
}

function element(
	tag: string,
	line: number,
	col: number,
	attributes: readonly { name: string; value: string }[] = [],
): PositionedNode {
	return {
		nodeType: 1,
		localName: tag,
		id: '',
		classList: {
			contains: () => false,
			[Symbol.iterator]: function* () {},
		},
		attributes: attributes.map(({ name, value }) => ({ name, value })),
		parentElement: null,
		children: [],
		startLine: line,
		startCol: col,
	} as unknown as PositionedNode;
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
