import { describe, expect, test } from 'vitest';

import { parser } from './parser.js';

function firstStartTag(source: string) {
	const [node] = parser.parse(source).nodeList;
	if (node?.type !== 'starttag') {
		throw new Error(`The first node of ${source} is not a start tag`);
	}
	return node;
}

// A JSX element name starts with an ECMAScript `IdentifierStart` (https://facebook.github.io/jsx/#prod-JSXIdentifier)
describe('a tag whose name starts with `$`, `_` or a non-ASCII letter', () => {
	test.each([
		['<Ui$><span>c</span></Ui$>', 'Ui$'],
		['<Ui_><span>c</span></Ui_>', 'Ui_'],
		['<$Ui><span>c</span></$Ui>', '$Ui'],
		['<$ui.Item><span>c</span></$ui.Item>', '$ui.Item'],
		['<_Ui><span>c</span></_Ui>', '_Ui'],
		['<Éa><span>c</span></Éa>', 'Éa'],
		// A letter outside the BMP: the scanner reads by code point
		['<𠮷a><span>c</span></𠮷a>', '𠮷a'],
	])('%s is an element named as written', (source, name) => {
		const nodes = parser.parse(source).nodeList;
		expect(nodes.map(node => node.nodeName)).toStrictEqual([name, 'span', '#text', 'span', name]);
	});

	test('is not a fragment, and keeps its attributes', () => {
		const start = firstStartTag('<$Ui title="t"><span /></$Ui>');
		expect(start.nodeName).toBe('$Ui');
		expect(start.isFragment).toBe(false);
		expect(start.attributes.map(attr => ('name' in attr ? attr.name.raw : ''))).toStrictEqual(['title']);
	});

	test.each(['$Ui', '_Ui', 'Éa', '$ui.Item'])('<%s> is an authored element', name => {
		expect(firstStartTag(`<${name}><span /></${name}>`).elementType).toBe('authored');
	});

	// The element type follows `isComponentName`: a `-` makes the name of an intrinsic element in the JSX
	// compilers (`isIntrinsicJsxName` of TypeScript), whatever the initial is, and a custom element name is no component.
	test.each([
		['Foo-bar', 'html'],
		['my-widget.v2', 'web-component'],
	])('<%s> is not an authored element: %s', (name, elementType) => {
		expect(firstStartTag(`<${name}><span /></${name}>`).elementType).toBe(elementType);
	});

	test('an element of a lowercase ASCII letter is still an html element', () => {
		expect(firstStartTag('<a$ />').elementType).toBe('html');
	});
});
