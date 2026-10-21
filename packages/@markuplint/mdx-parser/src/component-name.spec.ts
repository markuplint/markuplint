import { describe, expect, test } from 'vitest';

import { parser } from './parser.js';

// An MDX component is a JSX element: the same rule as `@markuplint/jsx-parser`, which names it a
// component unless it starts with a lowercase ASCII letter (a `-` makes it an intrinsic element).
describe('isComponentName', () => {
	test.each(['Foo', 'RouterLink', 'Tabs.Root', 'ns.Item', 'motion.div', '_Layout', '$Ui', 'Ärger', 'Éa'])(
		'"%s" is a component name',
		name => {
			expect(parser.isComponentName(name)).toBe(true);
		},
	);

	test.each([
		'div',
		'svg',
		'foreignObject',
		'x-foo',
		'my-widget.v2',
		'annotation-xml',
		'Foo-bar',
		'#jsx-fragment',
		'',
	])('"%s" is not a component name', name => {
		expect(parser.isComponentName(name)).toBe(false);
	});
});
