import * as markuplint from 'markuplint';
// @ts-ignore This has not types
import Prh from 'textlint-rule-prh';
import path from 'path';

import { text } from './test-utils';

test('is test 1', async () => {
	const r = await markuplint.verify(
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

	expect(r).toStrictEqual([
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
	const r = await markuplint.exec({
		sourceCodes: text,
		names: path.resolve('test/fixture/textlint/test.html'),
		config: {
			rules: {
				textlint: true,
			},
		},
	});

	expect(r[0].violations).toStrictEqual([
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
