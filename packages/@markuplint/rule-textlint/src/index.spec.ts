import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { mlTest, mlTestFile } from 'markuplint';
// @ts-ignore
import Prh from 'textlint-rule-prh';
import { test, expect } from 'vitest';

import { text } from './test-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('is test 1', async () => {
	const { violations } = await mlTest(
		text,
		{
			rules: {
				textlint: {
					options: {
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
