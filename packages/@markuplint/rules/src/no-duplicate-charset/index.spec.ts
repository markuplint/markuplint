import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-duplicate-charset-valid-001] single meta charset', async () => {
	const { violations } = await mlRuleTest(rule, '<head><meta charset="UTF-8"></head>');
	expect(violations).toStrictEqual([]);
});

test('[no-duplicate-charset-valid-002] no meta charset', async () => {
	const { violations } = await mlRuleTest(rule, '<head><title>test</title></head>');
	expect(violations).toStrictEqual([]);
});

test('[no-duplicate-charset-invalid-001] two meta charset', async () => {
	const { violations } = await mlRuleTest(rule, '<head><meta charset="UTF-8"><meta charset="UTF-8"></head>');
	expect(violations).toStrictEqual([
		expect.objectContaining({
			severity: 'error',
			raw: '<meta charset="UTF-8">',
			message: 'There must not be more than one "meta" element with the "charset" attribute in a document',
		}),
	]);
});

test('[no-duplicate-charset-invalid-002] two meta charset with different values', async () => {
	const { violations } = await mlRuleTest(rule, '<head><meta charset="UTF-8"><meta charset="Shift_JIS"></head>');
	expect(violations).toStrictEqual([
		expect.objectContaining({
			severity: 'error',
			raw: '<meta charset="Shift_JIS">',
			message: 'There must not be more than one "meta" element with the "charset" attribute in a document',
		}),
	]);
});
