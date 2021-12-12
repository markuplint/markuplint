import { mlRuleTest } from 'markuplint';

import rule from './';

test('input[required]', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<input type="text" required /><input type="text" required="required" />',
	);

	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 58,
			message: 'The "required" attribute is a boolean attribute. It doesn\'t need the value',
			raw: '="required"',
		},
	]);
});
