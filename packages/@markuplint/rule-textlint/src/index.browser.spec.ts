import path from 'node:path';

import { mlTest, mlTestFile } from 'markuplint';
// @ts-ignore
import Prh from 'textlint-rule-prh';
import { test, expect, beforeEach, afterAll, vi } from 'vitest';

import { text } from './test-utils.js';

/* eslint-disable no-console */
const originalErrorLogger = console.error;

let errorLogger: Function;

beforeEach(() => {
	errorLogger = console.error = vi.fn();
});

afterAll(() => {
	console.error = originalErrorLogger;
});
/* eslint-enable no-console */

test.skip('is test 1', async () => {
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
									// eslint-disable-next-line no-restricted-globals
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

test.skip('is test 2', async () => {
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

test.skip('is test 3', async () => {
	const { violations } = await mlTestFile(
		{
			sourceCode: text,
			name: path.resolve('test/fixture/textlint/test.html'),
		},
		{
			rules: {
				textlint: {
					options: true,
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
