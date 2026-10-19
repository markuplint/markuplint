import { describe, test, expect } from 'vitest';

import { isComponentName } from './decision.js';

describe('isComponentName', () => {
	test.each(['Tabs.Root', 'motion.div', 'Comp', 'RouterLink', 'Foo-Bar', 'ns.Item'])(
		'"%s" is a component name',
		name => {
			expect(isComponentName(name)).toBe(true);
		},
	);

	test.each(['div', 'svg', 'foreignObject', 'x-foo', 'my-widget.v2', 'annotation-xml', 'slot', 'component'])(
		'"%s" is not a component name',
		name => {
			expect(isComponentName(name)).toBe(false);
		},
	);

	test.each(['$Ui', '_Ui', '$ui', '_ui', 'Éa', 'éa', '$ui.Item'])(
		'"%s", which starts with no lowercase ASCII letter, is a component name',
		name => {
			expect(isComponentName(name)).toBe(true);
		},
	);

	test.each(['', '3d', ':foo'])('"%s", which starts with no IdentifierStart, is not a component name', name => {
		expect(isComponentName(name)).toBe(false);
	});
});
