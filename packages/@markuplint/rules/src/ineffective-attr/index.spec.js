// @ts-nocheck

import { mlRuleTest } from 'markuplint';

import rule from './';

test('script[defer]', async () => {
	const { violations } = await mlRuleTest(rule, '<script defer>const foo = "foo";</script>');

	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 9,
			message: 'The "defer" attribute is ineffective. It doesn\'t need the attribute',
			raw: 'defer',
		},
	]);
});

test('script[src][type=module][defer]', async () => {
	const { violations } = await mlRuleTest(rule, '<script type="module" src="path/to" defer></script>');

	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 37,
			message: 'The "defer" attribute is ineffective. It doesn\'t need the attribute',
			raw: 'defer',
		},
	]);
});
