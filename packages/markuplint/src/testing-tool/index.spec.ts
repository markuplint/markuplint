import presetRules from '@markuplint/rules';
import { describe, expect, test } from 'vitest';

import { mlRuleTest, mlTest, mlTestFile } from './index.js';

describe('mlRuleTest runs a rule by its registered name', () => {
	const noDuplicateId = presetRules['no-duplicate-id']!;

	test('a rule of the registry runs', async () => {
		const { violations } = await mlRuleTest(noDuplicateId, '<p id="a"></p><p id="a"></p>');

		expect(violations).toHaveLength(1);
	});

	test('a copy of a rule of the registry is not a registered rule', async () => {
		await expect(mlRuleTest({ ...noDuplicateId }, '<p></p>')).rejects.toThrow(
			/not a seed of the registry of "@markuplint\/rules"/,
		);
	});

	test('a rule that is not in the registry at all is not a registered rule', async () => {
		const own = { defaultValue: null, defaultOptions: null, verify() {} };

		await expect(mlRuleTest(own, '<p></p>')).rejects.toThrow(TypeError);
	});
});

describe('the third argument is the locale', () => {
	test.each([
		['mlTest', () => mlTest('<p></p>', {}, [] as never)],
		['mlTestFile', () => mlTestFile({ sourceCode: '<p></p>', name: 'a.html' }, {}, [] as never)],
	])('%s rejects a list of rules in the place of the locale', async (_name, call) => {
		await expect(call()).rejects.toThrow(/a rule cannot be given to the testing API/);
	});

	test.each([
		['mlTest', () => mlTest('<p></p>', {}, undefined, 'en' as never)],
		['mlTestFile', () => mlTestFile({ sourceCode: '<p></p>', name: 'a.html' }, {}, undefined, 'en' as never)],
	])(
		'%s rejects `undefined` in the place of the rules, as the locale would be read as `fix`',
		async (_name, call) => {
			await expect(call()).rejects.toThrow(/a rule cannot be given to the testing API/);
		},
	);

	test('a locale is applied to the message', async () => {
		const { violations } = await mlTest(
			'<p id="a"></p><p id="a"></p>',
			{ rules: { 'no-duplicate-id': true } },
			'ja',
		);

		expect(violations).toHaveLength(1);
		expect(violations[0]?.message).toBe('属性「id」の値が重複しています');
	});
});
