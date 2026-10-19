import { describe, expect, test } from 'vitest';

import { parser } from './parser.js';

// A JSX element name is a component unless it starts with a lowercase ASCII letter, as the JSX
// compilers decide (`isIntrinsicJsxName` of TypeScript: a lowercase initial or a `-` makes it an element).
describe('isComponentName', () => {
	test.each([
		'Foo',
		'RouterLink',
		'Tabs.Root',
		'ns.Item',
		'motion.div',
		// Not a lowercase ASCII letter, so a variable
		'_Layout',
		'$Ui',
		'Ärger',
		'Éa',
	])('"%s" is a component name', name => {
		expect(parser.isComponentName(name)).toBe(true);
	});

	test.each([
		'div',
		'svg',
		'foreignObject',
		'x-foo',
		'my-widget.v2',
		'annotation-xml',
		// A hyphen makes the name of an intrinsic element, whatever the initial is
		'Foo-bar',
		// Not a name of an element
		'#jsx-fragment',
		'',
	])('"%s" is not a component name', name => {
		expect(parser.isComponentName(name)).toBe(false);
	});
});
