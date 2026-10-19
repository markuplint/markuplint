import { describe, expect, test } from 'vitest';

import { parser } from './parser.js';

// Svelte: a lowercase tag is an HTML element; a capitalised tag or one with dot notation is a component.
describe('isComponentName', () => {
	test.each(['Foo', 'RouterLink', 'Tabs.Root', 'ui.Item', 'motion.div'])('"%s" is a component name', name => {
		expect(parser.isComponentName(name)).toBe(true);
	});

	test.each(['div', 'foo', 'x-foo', 'foreignObject', 'my-widget.v2'])('"%s" is not a component name', name => {
		expect(parser.isComponentName(name)).toBe(false);
	});
});
