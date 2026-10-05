import { describe, test, expect } from 'vitest';

import { componentScanner } from './component-scanner.js';

function scanAttrs(attrs: string) {
	return componentScanner.scanComponent(`<template>\n\t<button ${attrs}>x</button>\n</template>`)?.attrs;
}

describe('componentScanner (Vue): dynamic attributes', () => {
	test('both forms of a binding are dynamic attributes of their own name', () => {
		expect(scanAttrs(':type="a" v-bind:title="b"')).toStrictEqual([
			// { name: 'type', dynamic: true }, // without `expression`
			// { name: 'title', dynamic: true }, // without `expression`
			{ name: 'type', dynamic: true, expression: 'a' },
			{ name: 'title', dynamic: true, expression: 'b' },
		]);
	});

	test('the name of a binding is lowercased', () => {
		// expect(scanAttrs(':tabIndex="a"')).toStrictEqual([{ name: 'tabindex', dynamic: true }]); // without `expression`
		expect(scanAttrs(':tabIndex="a"')).toStrictEqual([{ name: 'tabindex', dynamic: true, expression: 'a' }]);
	});

	test('key and ref are not attributes', () => {
		expect(scanAttrs(':key="k" :ref="r" :is="c"')).toStrictEqual([]);
	});

	test('a binding with a modifier, a dynamic name, or the .prop shorthand has no name known here', () => {
		expect(scanAttrs(':foo.camel="x" :[name]="y" .prop="z"')).toStrictEqual([]);
	});

	test('events, v-bind objects, and the other directives are not attributes', () => {
		expect(
			scanAttrs('@click.once="go" v-on:focus="f" v-bind="$attrs" v-model="m" v-html="h" v-show="s" v-if="c"'),
		).toStrictEqual([]);
	});

	test('static attributes are kept with their values', () => {
		expect(scanAttrs('type="button" disabled')).toStrictEqual([
			{ name: 'type', value: 'button' },
			{ name: 'disabled' },
		]);
	});

	test('a name written statically and as a binding is one dynamic attribute in the first position', () => {
		expect(scanAttrs('class="btn" id="a" :class="x"')).toStrictEqual([
			{ name: 'class', dynamic: true },
			{ name: 'id', value: 'a' },
		]);
	});
});

describe('componentScanner (Vue): spreads and the roots of the template', () => {
	const scan = (template: string) => componentScanner.scanComponent(`<template>\n${template}\n</template>`);

	test('v-bind without an argument is a spread of the root', () => {
		expect(scan('<button v-bind="$attrs" :type="kind" v-bind="rest">x</button>')?.spreads).toStrictEqual([
			'$attrs',
			'rest',
		]);
	});

	test('a root without v-bind has no spreads', () => {
		expect(scan('<button :type="kind">x</button>')).not.toHaveProperty('spreads');
	});

	test('a single root has no sibling roots', () => {
		expect(scan('<button>x</button>')).not.toHaveProperty('hasSiblingRoots');
	});

	test('v-else-if and v-else continue the v-if and are not other roots', () => {
		expect(scan('<p v-if="a">a</p><p v-else-if="b">b</p><p v-else>c</p>')).not.toHaveProperty('hasSiblingRoots');
	});

	test('another element beside the root is a sibling root', () => {
		expect(scan('<button>x</button><p>y</p>')?.hasSiblingRoots).toBe(true);
	});

	test('text beside the root is a sibling root', () => {
		expect(scan('<button>x</button>{{ y }}')?.hasSiblingRoots).toBe(true);
	});

	test('a name written in two forms is not one expression', () => {
		expect(scan('<button class="btn" :class="x">x</button>')?.attrs).toStrictEqual([
			{ name: 'class', dynamic: true },
		]);
	});

	test('a binding without an expression has no expression', () => {
		expect(scan('<button :type>x</button>')?.attrs).toStrictEqual([{ name: 'type', dynamic: true }]);
	});
});
