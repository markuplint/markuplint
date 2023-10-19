import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { mlTest, mlTestFile } from 'markuplint';
import Prh from 'textlint-rule-prh';
import { test, expect } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const textFilePath = path.resolve(__dirname, '..', 'test', 'fixture.html');
const text = await fs.readFile(textFilePath, 'utf8');

test('Manual', async () => {
	const { violations } = await mlTest(text, {
		rules: {
			textlint: {
				options: {
					rules: [
						{
							ruleId: 'prh',
							rule: Prh,
							options: {
								rulePaths: [path.resolve(__dirname, '..', 'prh.yml')],
							},
						},
					],
				},
			},
		},
	});

	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			ruleId: 'textlint',
			line: 11,
			col: 19,
			raw: 'jquery',
			message: 'Invalid text: jquery => jQuery',
		},
	]);
});

test('Cannot autoload', async () => {
	const { violations } = await mlTestFile(
		{
			sourceCode: text,
			name: textFilePath,
		},
		{
			rules: {
				textlint: true,
			},
		},
	);

	expect(violations.length).toEqual(0);
});
