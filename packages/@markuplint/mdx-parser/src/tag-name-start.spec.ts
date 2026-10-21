import { describe, test, expect } from 'vitest';

import type { MLASTElement } from '@markuplint/ml-ast';

import { parser } from './parser.js';

// An MDX element is a JSX element: its name starts with an ECMAScript `IdentifierStart`
describe('a JSX element whose name starts with `$`, `_` or a non-ASCII letter', () => {
	test.each(['$Ui', '_Ui', 'Éa', '$ui.Item'])('<%s> is an authored element named as written', name => {
		const [start] = parser.parse(`<${name}>\n  <span>c</span>\n</${name}>`).nodeList as readonly MLASTElement[];
		expect(start!.nodeName).toBe(name);
		expect(start!.elementType).toBe('authored');
	});

	// The element type follows `isComponentName`, as in `@markuplint/jsx-parser`: a `-` makes the name of an
	// intrinsic element in the JSX compilers, whatever the initial is, and a custom element name is no component.
	test.each([
		['Foo-bar', 'html'],
		['my-widget.v2', 'web-component'],
	])('<%s> is not an authored element: %s', (name, elementType) => {
		const [start] = parser.parse(`<${name}>\n  <span>c</span>\n</${name}>`).nodeList as readonly MLASTElement[];
		expect(start!.nodeName).toBe(name);
		expect(start!.elementType).toBe(elementType);
	});
});
