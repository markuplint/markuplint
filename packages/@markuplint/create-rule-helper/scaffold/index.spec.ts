import { mlRuleTest } from 'markuplint';

import rule from './';

/**
 * Example: Write tests
 */
it('is test', async () => {
	const { violations } = await mlRuleTest(
		rule,
		/**
		 * Example: The target HTML that is evaluated
		 */
		'<div><!-- TODO: I will do something --></div>',
	);

	/**
	 * Example: Set expected results.
	 */
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			raw: '<!-- TODO: I will do something -->',
			message: 'It is TODO',
		},
	]);
});
