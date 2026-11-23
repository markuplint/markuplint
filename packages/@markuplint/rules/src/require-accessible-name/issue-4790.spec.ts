import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

/**
 * A reference to an id that nothing in the file has may be one to an element that a spread attribute, a
 * component that no pretender resolved or content that is not known brings.
 */
describe('an id that the markup does not tell', () => {
	const parser = { '.*': '@markuplint/jsx-parser' };

	test.each([
		['a spread', '<><h2 {...props}>t</h2><button aria-labelledby="t" type="button" /></>'],
		['a spread after the id', '<><h2 id="a" {...props}>t</h2><button aria-labelledby="t" type="button" /></>'],
		['a component', '<><Header /><button aria-labelledby="t" type="button" /></>'],
		['a block of children', '<><div>{children}</div><button aria-labelledby="t" type="button" /></>'],
	])(
		'[require-accessible-name-issue-4790-001] %s may be the element that the reference refers to',
		async (_, source) => {
			expect((await mlRuleTest(rule, source, { parser })).violations).toStrictEqual([]);
		},
	);

	test('[require-accessible-name-issue-4790-002] a pretender with unknown contents may be, and one with declared contents is not', async () => {
		const unknownContents = await mlRuleTest(rule, '<><Dyn /><button aria-labelledby="t" type="button" /></>', {
			parser,
			pretenders: [{ selector: 'Dyn', as: { element: 'div', contents: [{ dynamic: true }] } }],
		});
		expect(unknownContents.violations).toStrictEqual([]);

		const knownContents = await mlRuleTest(rule, '<><Known /><button aria-labelledby="t" type="button" /></>', {
			parser,
			pretenders: [{ selector: 'Known', as: { element: 'div', contents: [{ element: 'span' }] } }],
		});
		expect(knownContents.violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 12,
				message: 'Require accessible name',
				raw: '<button aria-labelledby="t" type="button" />',
			},
		]);
	});

	test('[require-accessible-name-issue-4790-003] a spread before the id is overridden by it, so the reference is reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<><h2 {...props} id="a">t</h2><button aria-labelledby="t" type="button" /></>',
			{ parser },
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 31,
				message: 'Require accessible name',
				raw: '<button aria-labelledby="t" type="button" />',
			},
		]);
	});
});
