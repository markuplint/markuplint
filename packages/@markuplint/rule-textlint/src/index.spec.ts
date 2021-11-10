import path from 'path';

import { mlTest, mlTestFile } from 'markuplint';
// @ts-ignore This has not types
import Prh from 'textlint-rule-prh';

import { text } from './test-utils';

test('is test 1', async () => {
	const { violations } = await mlTest(
		text,
		{
			rules: {
				textlint: {
					option: {
						rules: [
							{
								ruleId: 'prh',
								rule: Prh,
								options: {
									rulePaths: [path.resolve(__dirname, '../', 'prh.yml')],
								},
							},
						],
					},
				},
			},
		},
		// Auto loading
		[],
		'en',
	);

	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			ruleId: 'textlint',
			line: 11,
			col: 20,
			raw: 'jquery',
			message: 'Invalid text: jquery => jQuery',
		},
	]);
});

test('is test 2', async () => {
	const { violations } = await mlTestFile(
		{
			sourceCode: text,
			name: path.resolve('test/fixture/textlint/test.html'),
		},
		{
			rules: {
				textlint: true,
			},
		},
	);

	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			ruleId: 'textlint',
			line: 11,
			col: 20,
			raw: 'jquery',
			message: 'Invalid text: jquery => jQuery',
		},
	]);
});
