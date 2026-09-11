import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[progress-value-bounds-valid-001] progress without any attributes', async () => {
	const { violations } = await mlRuleTest(rule, '<progress>50%</progress>');
	expect(violations.length).toBe(0);
});

test('[progress-value-bounds-valid-002] progress with value within default max (1)', async () => {
	const { violations } = await mlRuleTest(rule, '<progress value="0.5">half</progress>');
	expect(violations.length).toBe(0);
});

test('[progress-value-bounds-valid-003] progress with value equal to default max (1)', async () => {
	const { violations } = await mlRuleTest(rule, '<progress value="1">done</progress>');
	expect(violations.length).toBe(0);
});

test('[progress-value-bounds-valid-004] progress with value within explicit max', async () => {
	const { violations } = await mlRuleTest(rule, '<progress value="30" max="100">30%</progress>');
	expect(violations.length).toBe(0);
});

test('[progress-value-bounds-valid-005] progress with value equal to explicit max', async () => {
	const { violations } = await mlRuleTest(rule, '<progress value="100" max="100">done</progress>');
	expect(violations.length).toBe(0);
});

test('[progress-value-bounds-invalid-001] value exceeds explicit max', async () => {
	const { violations } = await mlRuleTest(rule, '<progress value="10" max="5">10 of 5</progress>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 18,
			message:
				'The value of the "value" attribute must be less than or equal to the value of the "max" attribute',
			raw: '10',
		},
	]);
});

test('[progress-value-bounds-invalid-002] value exceeds default max (1)', async () => {
	const { violations } = await mlRuleTest(rule, '<progress value="1.5">150%</progress>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 18,
			message:
				'The value of the "value" attribute must be less than or equal to one when the "max" attribute is absent',
			raw: '1.5',
		},
	]);
});

test('[progress-value-bounds-valid-006] non-numeric literal value is left to no-invalid-attr-value', async () => {
	// `{{ v }}` fails Number() (returns NaN); with the default HTML parser it is not dynamic —
	// this exercises the `valueNum === null` early return, not `isDynamicValue`.
	const { violations } = await mlRuleTest(rule, '<progress value="{{ v }}" max="10">{{ v }}</progress>');
	expect(violations.length).toBe(0);
});

test('[progress-value-bounds-valid-007] unparsable value is left to no-invalid-attr-value', async () => {
	const { violations } = await mlRuleTest(rule, '<progress value="abc" max="10">abc</progress>');
	expect(violations.length).toBe(0);
});

test('[progress-value-bounds-valid-008] unparsable max is left to no-invalid-attr-value', async () => {
	const { violations } = await mlRuleTest(rule, '<progress value="0.5" max="abc">50%</progress>');
	expect(violations.length).toBe(0);
});

test('[progress-value-bounds-valid-009] progress with only max attribute (no value)', async () => {
	const { violations } = await mlRuleTest(rule, '<progress max="50">unknown</progress>');
	expect(violations.length).toBe(0);
});

test('[progress-value-bounds-parser-001] pretender without `as` attribute is skipped', async () => {
	// pretenderContext.type === 'pretender' && !hasAttribute('as'): attributes are unknown
	// until the component is `as`-pinned, so bounds cannot be enforced.
	const { violations } = await mlRuleTest(rule, '<MyProgress value="10" max="5">10 of 5</MyProgress>', {
		parser: {
			'.*': '@markuplint/jsx-parser',
		},
		pretenders: [
			{
				selector: 'MyProgress',
				as: {
					element: 'progress',
					inheritAttrs: true,
				},
			},
		],
	});
	expect(violations).toStrictEqual([]);
});

test('[progress-value-bounds-parser-002] pretender with `as` attribute is verified', async () => {
	// The `as` attribute pins the component to a concrete element, so bounds enforcement resumes.
	const { violations } = await mlRuleTest(rule, '<MyProgress as="progress" value="10" max="5">10 of 5</MyProgress>', {
		parser: {
			'.*': '@markuplint/jsx-parser',
		},
		pretenders: [
			{
				selector: 'MyProgress',
				as: {
					element: 'progress',
					inheritAttrs: true,
				},
			},
		],
	});
	expect(violations.length).toBe(1);
	expect(violations[0]?.message).toBe(
		'The value of the "value" attribute must be less than or equal to the value of the "max" attribute',
	);
});
