import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

describe('verify', () => {
	test('[case-sensitive-attr-name-valid-001] lower case', async () => {
		const { violations } = await mlRuleTest(rule, '<div data-lowercase></div>');
		expect(violations).toStrictEqual([]);
	});

	test('[case-sensitive-attr-name-invalid-001] upper case', async () => {
		const { violations } = await mlRuleTest(rule, '<div data-UPPERCASE="value"></div>');
		expect(violations[0]?.severity).toBe('warning');
		expect(violations[0]?.message).toBe('Attribute names of HTML elements should be lowercase');
		expect(violations[0]?.raw).toBe('data-UPPERCASE');
	});

	test('[case-sensitive-attr-name-invalid-002] upper case', async () => {
		const { violations } = await mlRuleTest(rule, '<div data-UPPERCASE="value"></div>', {
			rule: {
				severity: 'error',
				value: 'upper',
			},
		});
		expect(violations[0]?.severity).toBe('error');
		expect(violations[0]?.message).toBe('Attribute names of HTML elements must be uppercase');
	});

	test('[case-sensitive-attr-name-invalid-003] upper case', async () => {
		const { violations } = await mlRuleTest(rule, '<div data-uppercase="value"></div>', {
			rule: {
				severity: 'error',
				value: 'upper',
			},
		});
		expect(violations[0]?.severity).toBe('error');
		expect(violations[0]?.message).toBe('Attribute names of HTML elements must be uppercase');
	});

	test('[case-sensitive-attr-name-valid-002] upper case', async () => {
		const { violations } = await mlRuleTest(rule, '<div DATA-UPPERCASE="value"></div>', {
			rule: { severity: 'error', value: 'upper' },
		});
		expect(violations.length).toBe(0);
	});

	test('[case-sensitive-attr-name-valid-003] svg', async () => {
		const { violations } = await mlRuleTest(rule, '<svg viewBox="0 0 100 100"></svg>');
		expect(violations.length).toBe(0);
	});
});

describe('fix', () => {
	test('[case-sensitive-attr-name-fix-001] upper case', async () => {
		const { fixedCode } = await mlRuleTest(rule, '<DIV DATA-LOWERCASE></DIV>', undefined, true);
		expect(fixedCode).toBe('<DIV data-lowercase></DIV>');
	});

	test('[case-sensitive-attr-name-fix-002] upper case', async () => {
		const { fixedCode } = await mlRuleTest(rule, '<DIV data-lowercase></DIV>', { rule: 'upper' }, true);
		expect(fixedCode).toBe('<DIV DATA-LOWERCASE></DIV>');
	});
});
