import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

test('Consecutive', async () => {
	const { violations } = await mlRuleTest(rule, '<p>A<br data-first> <br data-second>B</p>');
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 21,
			raw: '<br data-second>',
			message: 'Consecutive "br" elements detected',
		},
	]);
});

test('No consecutive', async () => {
	const { violations } = await mlRuleTest(rule, '<p>A<br data-first>B<br data-second>C</p>');
	expect(violations.length).toBe(0);
});

describe('fix', () => {
	test('remove second consecutive br', async () => {
		const { fixedCode } = await mlRuleTest(rule, '<p>text<br><br></p>', undefined, true);
		expect(fixedCode).toBe('<p>text<br></p>');
	});

	test('three consecutive br elements', async () => {
		const { fixedCode } = await mlRuleTest(rule, '<p>text<br><br><br></p>', undefined, true);
		expect(fixedCode).toBe('<p>text<br></p>');
	});

	test('consecutive br with whitespace between', async () => {
		const { fixedCode } = await mlRuleTest(rule, '<p>text<br>  \n  <br></p>', undefined, true);
		expect(fixedCode).toBe('<p>text<br>  \n  </p>');
	});
});
