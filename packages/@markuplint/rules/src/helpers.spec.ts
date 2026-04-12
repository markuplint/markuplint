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
 * #3685 — Integration tests for `isValidAttr`.
 *
 * These exercise the boundary where the `invalid-attr` rule meets the
 * attribute spec data. `ConditionalAttributeType[]` is a v5.0 type-only
 * extension (validation logic lands in #3598 / #3189). Until then, an
 * attribute whose spec uses `ConditionalAttributeType[]` must be treated
 * as valid — no crash, no false positive reported through the rule pipeline.
 */
test('[helpers-issue-3685-001] isValidAttr passes through ConditionalAttributeType[] without false positives', () => {
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
	// v5.0: short-circuits to valid — follow-up #3598/#3189 implements logic.
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
