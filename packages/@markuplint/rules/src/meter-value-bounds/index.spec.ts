import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[meter-value-bounds-001] meter without any attributes', async () => {
	const { violations } = await mlRuleTest(rule, '<meter>5</meter>');
	expect(violations.length).toBe(0);
});

test('[meter-value-bounds-002] meter with value within default bounds', async () => {
	const { violations } = await mlRuleTest(rule, '<meter value="0.5">half</meter>');
	expect(violations.length).toBe(0);
});

test('[meter-value-bounds-003] meter with all attributes consistent', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<meter value="5" min="0" max="10" low="3" high="7" optimum="6">5</meter>',
	);
	expect(violations.length).toBe(0);
});

test('[meter-value-bounds-004] meter with negative range', async () => {
	const { violations } = await mlRuleTest(rule, '<meter value="-5" min="-10" max="0">-5</meter>');
	expect(violations.length).toBe(0);
});

test('[meter-value-bounds-005] value exceeds max', async () => {
	const { violations } = await mlRuleTest(rule, '<meter value="10" max="5">10 out of 5</meter>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 15,
			message:
				'The value of the "value" attribute must be less than or equal to the value of the "max" attribute',
			raw: '10',
		},
	]);
});

test('[meter-value-bounds-006] value exceeds default max (1)', async () => {
	const { violations } = await mlRuleTest(rule, '<meter value="2">2</meter>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 15,
			message:
				'The value of the "value" attribute must be less than or equal to one when the "max" attribute is absent',
			raw: '2',
		},
	]);
});

test('[meter-value-bounds-007] value below min', async () => {
	const { violations } = await mlRuleTest(rule, '<meter value="0" min="5">0 out of 10</meter>');
	expect(violations.some(v => /min.+less than or equal to one when the "max"/.test(v.message))).toBe(true);
	expect(violations.some(v => /min.+less than or equal to the value of the "value"/.test(v.message))).toBe(true);
});

test('[meter-value-bounds-008] min exceeds max', async () => {
	const { violations } = await mlRuleTest(rule, '<meter value="5" min="10" max="5">5</meter>');
	expect(violations.some(v => /min.+less than or equal to the value of the "max"/.test(v.message))).toBe(true);
	expect(violations.some(v => /min.+less than or equal to the value of the "value"/.test(v.message))).toBe(true);
});

test('[meter-value-bounds-009] high exceeds max', async () => {
	const { violations } = await mlRuleTest(rule, '<meter value="5" max="10" high="15">5</meter>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 33,
			message: 'The value of the "high" attribute must be less than or equal to the value of the "max" attribute',
			raw: '15',
		},
	]);
});

test('[meter-value-bounds-010] low exceeds high (both specified, max default)', async () => {
	const { violations } = await mlRuleTest(rule, '<meter value="5" low="8" high="3">5</meter>');
	const messages = violations.map(v => v.message);
	expect(messages).toContain(
		'The value of the "value" attribute must be less than or equal to one when the "max" attribute is absent',
	);
	expect(messages).toContain(
		'The value of the "low" attribute must be less than or equal to one when the "max" attribute is absent',
	);
	expect(messages).toContain(
		'The value of the "high" attribute must be less than or equal to one when the "max" attribute is absent',
	);
	expect(messages).toContain(
		'The value of the "low" attribute must be less than or equal to the value of the "high" attribute',
	);
});

test('[meter-value-bounds-011] optimum exceeds max', async () => {
	const { violations } = await mlRuleTest(rule, '<meter value="5" max="10" optimum="15">5</meter>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 36,
			message:
				'The value of the "optimum" attribute must be less than or equal to the value of the "max" attribute',
			raw: '15',
		},
	]);
});

test('[meter-value-bounds-012] optimum below min', async () => {
	const { violations } = await mlRuleTest(rule, '<meter value="5" min="3" optimum="1">5</meter>');
	const messages = violations.map(v => v.message);
	expect(messages).toContain(
		'The value of the "min" attribute must be less than or equal to one when the "max" attribute is absent',
	);
	expect(messages).toContain(
		'The value of the "value" attribute must be less than or equal to one when the "max" attribute is absent',
	);
});

test('[meter-value-bounds-013] dynamic value attributes are skipped', async () => {
	// Templating frameworks pass through to no-invalid-attr-value / parser layers; the bounds rule
	// has nothing to assert without a concrete numeric value.
	const { violations } = await mlRuleTest(rule, '<meter value="{{ score }}" max="10">{{ score }}</meter>');
	expect(violations.length).toBe(0);
});

test('[meter-value-bounds-014] unparsable specified value is left to no-invalid-attr-value', async () => {
	const { violations } = await mlRuleTest(rule, '<meter value="abc" max="10">abc</meter>');
	expect(violations.length).toBe(0);
});

test('[meter-value-bounds-015] the names of the attributes are shown as written (`value` is also a keyword) with locale ja', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<meter min="3" max="10" value="12"></meter>',
		undefined,
		false,
		'ja',
	);

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 32,
			message: '「value」属性の値は「max」属性の値以下であるべきです',
			raw: '12',
		},
	]);
});

test('[meter-value-bounds-016] an absent attribute is in Japanese with locale ja', async () => {
	const { violations } = await mlRuleTest(rule, '<meter min="5" value="7"></meter>', undefined, false, 'ja');

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 13,
			message: '「min」属性の値は「max」属性がない場合の1以下であるべきです',
			raw: '5',
		},
		{
			severity: 'error',
			line: 1,
			col: 23,
			message: '「value」属性の値は「max」属性がない場合の1以下であるべきです',
			raw: '7',
		},
	]);
});

test.each([' 2 ', '+2', '2.', '2\u00A0'])(
	'[meter-value-bounds-017] the number is read as the browser reads it, skipping ASCII white space before it: %j',
	async value => {
		const { violations } = await mlRuleTest(rule, `<meter value="${value}" max="1"></meter>`);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 15,
				message:
					'The value of the "value" attribute must be less than or equal to the value of the "max" attribute',
				raw: value,
			},
		]);
	},
);

test('[meter-value-bounds-018] U+00A0 before the number is not ASCII white space, so the value has no number', async () => {
	const { violations } = await mlRuleTest(rule, '<meter value="\u00A02" max="1"></meter>');
	expect(violations).toStrictEqual([]);
});
