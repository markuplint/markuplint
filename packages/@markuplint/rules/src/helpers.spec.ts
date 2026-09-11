import type { Translator } from '@markuplint/i18n';
import type { Attribute } from '@markuplint/ml-spec';

import { translator } from '@markuplint/i18n';
import { createTestElement } from '@markuplint/ml-core';
import { i18n } from 'markuplint';
import { test, expect, beforeAll } from 'vitest';

import { attrCheck } from './attr-check.js';
import { resolveAttrEligibility } from './attr-eligibility.js';

let t: Translator;

beforeAll(() => {
	const locale = i18n('en');
	t = translator(locale);
});

/**
 * Runs the same two-step pipeline `no-invalid-attr-value` runs: resolve
 * eligibility (which also resolves `ConditionalAttributeType[]` to a
 * concrete type), then check the value against the resolved spec.
 * Returns `false` when valid, an `Invalid` (or array) otherwise — matching
 * the pre-split `isValidAttr`'s return shape these tests were written against.
 */
function checkValue(
	name: string,
	value: string,
	isDynamicValue: boolean,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: ReturnType<typeof createTestElement>,
	attrSpecs: readonly Attribute[],
) {
	const eligibility = resolveAttrEligibility(name, el, attrSpecs);
	if (eligibility.status !== 'ok') {
		return { invalidType: 'non-existent', message: '' } as const;
	}
	const invalid = attrCheck(t, name, value, false, eligibility.spec);
	if (invalid !== false && isDynamicValue) {
		return false;
	}
	return invalid;
}

/*
 * #3685 / #3598 — Integration tests for `resolveAttrEligibility` with ConditionalAttributeType[].
 *
 * These exercise the boundary where the spec-validating rules (`no-unknown-attr`,
 * `no-disallowed-attr`, `no-invalid-attr-value`) meet the attribute spec data.
 * `resolveAttrEligibility` resolves `ConditionalAttributeType[]` by matching the
 * element against each condition and validating against the matched type. If no
 * condition matches, it falls back to `Any`.
 */
test('[helpers-issue-3685-001] falls back to Any when no condition matches', () => {
	const el = createTestElement('<custom-el value="not-a-url-or-color"></custom-el>');
	const attrSpecs: readonly Attribute[] = [
		{
			name: 'value',
			type: [
				{ condition: "[type='color' i]", type: "<'color'>" },
				{ condition: "[type='url' i]", type: 'URL' },
			],
		},
	];
	const result = checkValue('value', 'not-a-url-or-color', false, el, attrSpecs);
	// No condition matches (element has no `type` attribute) → fallback to Any → valid.
	expect(result).toBe(false);
});

test('[helpers-issue-3685-002] still reports violations for regular AttributeType[] specs', () => {
	const el = createTestElement('<custom-el autocomplete="bogus"></custom-el>');
	const attrSpecs: readonly Attribute[] = [
		{
			name: 'autocomplete',
			type: [{ enum: ['on', 'off'] }],
		},
	];
	const result = checkValue('autocomplete', 'bogus', false, el, attrSpecs);
	// Enum[] is not a ConditionalAttributeType[] → normal path → violation reported.
	expect(result).not.toBe(false);
});

test('[helpers-issue-3685-003] does not crash when attribute is absent from a conditional spec', () => {
	const el = createTestElement('<custom-el></custom-el>');
	const attrSpecs: readonly Attribute[] = [
		{
			name: 'value',
			type: [{ condition: "[type='color' i]", type: "<'color'>" }],
		},
	];
	// Missing attribute: "unknown-attr" is not in the spec → existence error,
	// but crucially the surrounding spec with ConditionalAttributeType[] must
	// not poison iteration over attrSpecs.
	const eligibility = resolveAttrEligibility('unknown-attr', el, attrSpecs);
	expect(eligibility.status).toBe('unknown');
});

/*
 * #3598 — Conditional type resolution tests.
 */
test('[helpers-issue-3598-001] resolves condition and validates: valid simple color', () => {
	const el = createTestElement('<input type="color" value="#ff0000">');
	const attrSpecs: readonly Attribute[] = [
		{
			name: 'value',
			type: [
				{ condition: "[type='color' i]", type: 'SimpleColor' },
				{ condition: "[type='url' i]", type: 'URL' },
			],
		},
	];
	const result = checkValue('value', '#ff0000', false, el, attrSpecs);
	expect(result).toBe(false);
});

test('[helpers-issue-3598-002] resolves condition and validates: invalid simple color', () => {
	const el = createTestElement('<input type="color" value="red">');
	const attrSpecs: readonly Attribute[] = [
		{
			name: 'value',
			type: [
				{ condition: "[type='color' i]", type: 'SimpleColor' },
				{ condition: "[type='url' i]", type: 'URL' },
			],
		},
	];
	const result = checkValue('value', 'red', false, el, attrSpecs);
	expect(result).not.toBe(false);
});

test('[helpers-issue-3598-003] resolves second condition: valid URL', () => {
	const el = createTestElement('<input type="url" value="https://example.com">');
	const attrSpecs: readonly Attribute[] = [
		{
			name: 'value',
			type: [
				{ condition: "[type='color' i]", type: 'SimpleColor' },
				{ condition: "[type='url' i]", type: 'URL' },
			],
		},
	];
	const result = checkValue('value', 'https://example.com', false, el, attrSpecs);
	expect(result).toBe(false);
});

test('[helpers-issue-3598-004] resolves second condition: invalid URL', () => {
	const el = createTestElement('<input type="url" value="http://example.com/a b">');
	const attrSpecs: readonly Attribute[] = [
		{
			name: 'value',
			type: [
				{ condition: "[type='color' i]", type: 'SimpleColor' },
				{ condition: "[type='url' i]", type: 'URL' },
			],
		},
	];
	// Absolute URL with unencoded space — reliably rejected by the URL checker.
	const result = checkValue('value', 'http://example.com/a b', false, el, attrSpecs);
	expect(result).not.toBe(false);
});

test('[helpers-issue-3598-005] unmatched type falls back to Any', () => {
	const el = createTestElement('<input type="text" value="anything">');
	const attrSpecs: readonly Attribute[] = [
		{
			name: 'value',
			type: [
				{ condition: "[type='color' i]", type: 'SimpleColor' },
				{ condition: "[type='url' i]", type: 'URL' },
			],
		},
	];
	const result = checkValue('value', 'anything', false, el, attrSpecs);
	// type=text matches no condition → fallback to Any → valid.
	expect(result).toBe(false);
});

test('[helpers-issue-3598-006] case-insensitive condition matching', () => {
	const el = createTestElement('<input type="COLOR" value="red">');
	const attrSpecs: readonly Attribute[] = [
		{
			name: 'value',
			type: [{ condition: "[type='color' i]", type: 'SimpleColor' }],
		},
	];
	const result = checkValue('value', 'red', false, el, attrSpecs);
	// type=COLOR matches [type='color' i] → validates as SimpleColor → "red" is invalid.
	expect(result).not.toBe(false);
});

test('[helpers-issue-3598-007] array condition (OR logic)', () => {
	const el = createTestElement('<input type="number" value="42">');
	const attrSpecs: readonly Attribute[] = [
		{
			name: 'value',
			type: [
				{
					condition: ["[type='number' i]", "[type='range' i]"],
					type: { type: 'float' },
				},
			],
		},
	];
	const result = checkValue('value', '42', false, el, attrSpecs);
	expect(result).toBe(false);
});

test('[helpers-issue-3598-008] isDynamicValue suppresses invalid-value after conditional resolution', () => {
	const el = createTestElement('<input type="color" value="red">');
	const attrSpecs: readonly Attribute[] = [
		{
			name: 'value',
			type: [{ condition: "[type='color' i]", type: 'SimpleColor' }],
		},
	];
	// "red" is invalid SimpleColor, but isDynamicValue=true should suppress invalid-value errors.
	const result = checkValue('value', 'red', true, el, attrSpecs);
	expect(result).toBe(false);
});
