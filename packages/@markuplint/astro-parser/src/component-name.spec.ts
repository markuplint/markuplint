import { describe, expect, test } from 'vitest';

import { parser } from './parser.js';

// Astro renders a variable used as a tag as a literal HTML tag unless it is capitalized.
describe('isComponentName', () => {
	test.each(['Foo', 'RouterLink', 'Tabs.Root'])('"%s" is a component name', name => {
		expect(parser.isComponentName(name)).toBe(true);
	});

	test.each(['div', 'foo', 'x-foo', 'foreignObject', 'ui.Item', 'motion.div', '_Layout', 'my-widget.v2'])(
		'"%s" is not a component name',
		name => {
			expect(parser.isComponentName(name)).toBe(false);
		},
	);
});
