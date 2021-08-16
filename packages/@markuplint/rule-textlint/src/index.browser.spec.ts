import { mlTest, mlTestFile } from 'markuplint';
// @ts-ignore This has not types
import Prh from 'textlint-rule-prh';
import path from 'path';

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

/* eslint-disable no-console */
const originalErrorLogger = console.error;

let errorLogger: jest.Mock;

beforeEach(() => {
	errorLogger = console.error = jest.fn();
});

afterAll(() => {
	console.error = originalErrorLogger;
});
/* eslint-enable no-console */

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

	expect(violations).toStrictEqual([]);
	expect(errorLogger).not.toBeCalled();
});

test('is test 3', async () => {
	const { violations } = await mlTestFile(
		{
			sourceCode: text,
			name: path.resolve('test/fixture/textlint/test.html'),
		},
		{
			rules: {
				textlint: {
					option: true,
				},
			},
		},
	);

	expect(violations).toStrictEqual([]);
	expect(errorLogger).toBeCalledTimes(1);
	expect(errorLogger).toBeCalledWith(
		'`config.option` with `true` value is only available on Node.js, please use plain `TextlintKernelOptions` instead',
	);
});
