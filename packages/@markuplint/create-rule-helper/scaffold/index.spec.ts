import { mlTest } from 'markuplint';

import rule from './';

/**
 * Example: Write tests
 */
it('is test', async () => {
	const { violations } = await mlTest(
		/**
		 * Example: The target HTML that is evaluated
		 */
		'<div><!-- TODO: I will do something --></div>',
		{
			rules:
				/**
				 * Example: Set the rule name and the value
				 *
				 * It doesn't run if set `false`.
				 */
				{
					'{{name}}': true,
				},
		},
		[rule],
		'en',
	);

	/**
	 * Example: Set expected results.
	 */
	expect(violations).toStrictEqual([
		{
			ruleId: '{{name}}',
			severity: 'error',
			line: 1,
			col: 6,
			raw: '<!-- TODO: I will do something -->',
			message: 'It is TODO',
		},
	]);
});
