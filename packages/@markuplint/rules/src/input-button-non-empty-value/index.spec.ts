import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[input-button-non-empty-value-valid-001] non-empty value', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="button" value="OK">');
	expect(violations.length).toBe(0);
});

test('[input-button-non-empty-value-valid-002] missing value attribute is acceptable', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="button">');
	expect(violations.length).toBe(0);
});

test('[input-button-non-empty-value-valid-003] non-button type with empty value', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="text" value="">');
	expect(violations.length).toBe(0);
});

test('[input-button-non-empty-value-invalid-001] empty value on type=button', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="button" value="">');
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe(
		'The "value" attribute on a "input" element with "type=button" must not be the empty string',
	);
});

test('[input-button-non-empty-value-invalid-002] case-insensitive type matching', async () => {
	const { violations } = await mlRuleTest(rule, '<input type="BUTTON" value="">');
	expect(violations.length).toBe(1);
});
