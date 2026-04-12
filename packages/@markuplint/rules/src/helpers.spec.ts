import type { Translator } from '@markuplint/i18n';
import type { Attribute } from '@markuplint/ml-spec';

import { translator } from '@markuplint/i18n';
import { createTestElement } from '@markuplint/ml-core';
import { i18n } from 'markuplint';
import { test, expect, beforeAll } from 'vitest';

import { isValidAttr } from './helpers.js';

let t: Translator;

beforeAll(() => {
	const locale = i18n('en');
	t = translator(locale);
});

/*
 * #3685 / #3598 — Integration tests for `isValidAttr` with ConditionalAttributeType[].
 *
 * These exercise the boundary where the `invalid-attr` rule meets the
 * attribute spec data. `isValidAttr` resolves `ConditionalAttributeType[]` by
 * matching the element against each condition and validating against the
 * matched type. If no condition matches, it falls back to `Any`.
 */
test('[helpers-issue-3685-001] isValidAttr falls back to Any when no condition matches', () => {
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
	const result = isValidAttr(t, 'value', 'not-a-url-or-color', false, el, attrSpecs);
	// No condition matches (element has no `type` attribute) → fallback to Any → valid.
	expect(result).toBe(false);
});

test('[helpers-issue-3685-002] isValidAttr still reports violations for regular AttributeType[] specs', () => {
	const el = createTestElement('<custom-el autocomplete="bogus"></custom-el>');
	const attrSpecs: readonly Attribute[] = [
		{
			name: 'autocomplete',
			type: [{ enum: ['on', 'off'] }],
		},
	];
	const result = isValidAttr(t, 'autocomplete', 'bogus', false, el, attrSpecs);
	// Enum[] is not a ConditionalAttributeType[] → normal path → violation reported.
	expect(result).not.toBe(false);
});

test('[helpers-issue-3685-003] isValidAttr does not crash when attribute is absent from a conditional spec', () => {
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
	const result = isValidAttr(t, 'unknown-attr', 'x', false, el, attrSpecs);
	expect(result).not.toBe(false);
	expect(result).toHaveProperty('invalidType', 'non-existent');
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
	const result = isValidAttr(t, 'value', '#ff0000', false, el, attrSpecs);
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
	const result = isValidAttr(t, 'value', 'red', false, el, attrSpecs);
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
	const result = isValidAttr(t, 'value', 'https://example.com', false, el, attrSpecs);
	expect(result).toBe(false);
});

test('[helpers-issue-3598-004] resolves second condition: invalid URL', () => {
	const el = createTestElement('<input type="url" value="not a url">');
	const attrSpecs: readonly Attribute[] = [
		{
			name: 'value',
			type: [
				{ condition: "[type='color' i]", type: 'SimpleColor' },
				{ condition: "[type='url' i]", type: 'URL' },
			],
		},
	];
	const result = isValidAttr(t, 'value', 'not a url', false, el, attrSpecs);
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
	const result = isValidAttr(t, 'value', 'anything', false, el, attrSpecs);
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
	const result = isValidAttr(t, 'value', 'red', false, el, attrSpecs);
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
	const result = isValidAttr(t, 'value', '42', false, el, attrSpecs);
	expect(result).toBe(false);
});
