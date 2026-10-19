// @ts-nocheck

import { describe, test, expect } from 'vitest';

import { parser } from './parser.js';

const parse = parser.parse.bind(parser);

describe('componentNameVariants', () => {
	test('Vue refers to a component by any spelling of its name', () => {
		expect(parser.componentNameVariants).toBe(true);
	});
});

describe('isComponentName', () => {
	test.each([
		'Foo',
		'FooBar',
		'fooBar',
		'foo2Bar',
		'ui.Item',
		'UI.Item',
		'Tabs.Root',
		// Resolved by the name before the `.`, though it has the form of a custom element name
		'my-widget.v2',
		// A built-in component is one as written or in kebab-case, as `detectElementType` takes it
		'Transition',
		'transition',
		'TransitionGroup',
		'transition-group',
		'KeepAlive',
		'keep-alive',
		'Teleport',
		'teleport',
		'Suspense',
		'suspense',
	])('"%s" is a component name', name => {
		expect(parser.isComponentName(name)).toBe(true);
	});

	test.each([
		'div',
		'foo',
		'foo-bar',
		'x-foo',
		// Special elements render what they are given
		'component',
		'slot',
		// The camelCase of SVG is an element
		'clipPath',
		'foreignObject',
	])('"%s" is not a component name', name => {
		expect(parser.isComponentName(name)).toBe(false);
	});
});

// A tag of a Vue template that is not a native one is a component to Vue (`isNativeTag` of `@vue/compiler-dom`:
// the lists of the HTML, SVG and MathML elements of `@vue/shared`). The lists are Vue's own, so an obsolete
// element that they do not have (`marquee`) is a component there, though markuplint has a specification for it.
describe('isNativeTag', () => {
	test.each(['div', 'button', 'span', 'circle', 'clipPath', 'foreignObject', 'mi', 'svg', 'math'])(
		'"%s" is a native tag',
		name => {
			expect(parser.isNativeTag(name)).toBe(true);
		},
	);

	test.each(['card', 'marquee', 'foobar', 'foo-bar', 'FooBar', 'Button', 'DIV', 'component', 'slot'])(
		'"%s" is not a native tag',
		name => {
			expect(parser.isNativeTag(name)).toBe(false);
		},
	);
});

describe('elementType of a tag that Vue resolves to a component', () => {
	test.each([
		// A name of more than one word is a component in camelCase and kebab-case too
		['FooBar', 'authored'],
		['fooBar', 'authored'],
		['foo2Bar', 'authored'],
		['foo-bar', 'web-component'],
		// `<foobar>` is not a reference to `FooBar`
		['foobar', 'html'],
		['foo', 'html'],
		['div', 'html'],
		// A member tag is resolved by the name before the first `.`
		['ui.Item', 'authored'],
		['UI.Item', 'authored'],
		['ui.sub.Item', 'authored'],
		// The built-in components, as written or in kebab-case
		['Transition', 'authored'],
		['transition', 'authored'],
		['TransitionGroup', 'authored'],
		['transition-group', 'authored'],
		['KeepAlive', 'authored'],
		['keep-alive', 'authored'],
		['Teleport', 'authored'],
		['teleport', 'authored'],
		['Suspense', 'authored'],
		['suspense', 'authored'],
		['component', 'authored'],
		['slot', 'authored'],
		// The names of the built-ins are the whole name, not a part of one
		['my-component', 'web-component'],
		['x-slot', 'web-component'],
		['slots', 'html'],
		['components', 'html'],
		['transitions', 'html'],
	])('<%s> is %s', (tag, expected) => {
		expect(parse(`<template><div><${tag} /></div></template>`).nodeList[1].elementType).toBe(expected);
	});

	test.each(['clipPath', 'foreignObject', 'linearGradient', 'feBlend', 'textPath'])(
		'<%s> of SVG is an element, not a component',
		tag => {
			const doc = parse(`<template><svg><${tag} /></svg></template>`);

			expect(doc.nodeList[1].elementType).toBe('html');
		},
	);

	test('the name is kept as written', () => {
		const doc = parse('<template><div><fooBar /></div></template>');

		expect(doc.nodeList[1].nodeName).toBe('fooBar');
	});
});
