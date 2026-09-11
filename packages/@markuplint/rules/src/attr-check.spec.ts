import type { Translator } from '@markuplint/i18n';
import type { Attribute as AttrSpec } from '@markuplint/ml-spec';

import { translator } from '@markuplint/i18n';
import { i18n } from 'markuplint';
import { test, expect, beforeAll } from 'vitest';

import { attrCheck, valueCheck } from './attr-check.js';

let t: Translator;

beforeAll(() => {
	const locale = i18n('en');
	t = translator(locale);
});

test('[attr-check-invalid-001] OneCodePointChar List', () => {
	expect(
		valueCheck(t, 'accesskey', '@ 12', {
			token: 'OneCodePointChar',
			separator: 'space',
			unique: true,
		}),
	).toStrictEqual([
		'the "accesskey" attribute expects space-separated list. the the content of the list part includes unexpected characters. It expects one code point character (https://html.spec.whatwg.org/multipage/interaction.html#the-accesskey-attribute)',
		{
			col: 2,
			line: 0,
			raw: '12',
		},
	]);
});

test('[attr-check-invalid-002] BrowsingContextNameOrKeyword', () => {
	expect(valueCheck(t, 'target', '', 'BrowsingContextNameOrKeyword')).toStrictEqual([
		'the "target" attribute must not be empty. It expects either "_blank", "_self", "_parent", "_top", "browsing context name" (https://html.spec.whatwg.org/multipage/browsers.html#valid-browsing-context-name-or-keyword)',
		{
			col: 0,
			line: 0,
			raw: '',
		},
	]);
});

test('[attr-check-invalid-003] BCP47', () => {
	// Empty string is valid per HTML LS (language set to unknown)
	expect(valueCheck(t, 'lang', '', 'BCP47')).toBe(false);
	// Invalid BCP47 should return error
	expect(valueCheck(t, 'lang', ':::', 'BCP47')).not.toBe(false);
});

test('[attr-check-invalid-004] DateTime', () => {
	expect(valueCheck(t, 'datetime', '200-1-1', 'DateTime')).toStrictEqual([
		'the year part of the "datetime" attribute expects four or more digits (https://html.spec.whatwg.org/multipage/text-level-semantics.html#datetime-value)',
		{
			col: 0,
			line: 0,
			raw: '200',
		},
	]);
	expect(valueCheck(t, 'datetime', '2000-1-1', 'DateTime')).toStrictEqual([
		'the month part of the "datetime" attribute expects two digits (https://html.spec.whatwg.org/multipage/text-level-semantics.html#datetime-value)',
		{
			col: 5,
			line: 0,
			raw: '1',
		},
	]);
	expect(valueCheck(t, 'datetime', '00:00:00.0000', 'DateTime')).toStrictEqual([
		'the fractional part part of the "datetime" attribute expects one to three digits (https://html.spec.whatwg.org/multipage/text-level-semantics.html#datetime-value)',
		{
			col: 9,
			line: 0,
			raw: '0000',
		},
	]);
});

test('[attr-check-invalid-005] Directive', () => {
	const directive = {
		directive: ['find '],
		token: '<complex-selector-list>',
	} as const;
	expect(valueCheck(t, 'x-attr', 'find #id', directive)).toBeFalsy();
	expect(valueCheck(t, 'x-attr', 'fin #id', directive)).toStrictEqual([
		'Missing a token. the "x-attr" attribute needs a directive',
		{
			col: 0,
			line: 0,
			raw: 'fin #id',
		},
	]);
});

/*
 * #3685 — ConditionalAttributeType[] ships as a type-only extension in v5.0.
 * Until follow-ups #3598 / #3189 implement value-conditional validation,
 * attrCheck must short-circuit to "valid" when a spec declares such a type.
 * These tests lock the guard in place so a regression cannot silently remove it.
 */
test('[attr-check-issue-3685-001] ConditionalAttributeType[] short-circuits to valid', () => {
	const spec: AttrSpec = {
		name: 'value',
		type: [
			{ condition: "[type='color' i]", type: "<'color'>" },
			{ condition: "[type='url' i]", type: 'URL' },
		],
	};
	// Any value must pass because validation is deferred to follow-up issues.
	expect(attrCheck(t, 'value', 'not-a-url-or-color', true, spec)).toBe(false);
	expect(attrCheck(t, 'value', '', true, spec)).toBe(false);
});

test('[attr-check-issue-3685-002] array of Enum is NOT treated as conditional (falls through)', () => {
	const spec: AttrSpec = {
		name: 'autocomplete',
		type: [{ enum: ['on', 'off'] }],
	};
	// 'on' matches the enum → normal path → early-return `false` (valid).
	expect(attrCheck(t, 'autocomplete', 'on', true, spec)).toBe(false);
	// 'bogus' matches no enum member → real violation reported (proves guard did NOT fire).
	const invalid = attrCheck(t, 'autocomplete', 'bogus', true, spec);
	expect(Array.isArray(invalid)).toBe(true);
	expect((invalid as readonly unknown[]).length).toBeGreaterThan(0);
});

test('[attr-check-issue-3685-003] empty type array falls through to normal path', () => {
	const spec: AttrSpec = { name: 'x-attr', type: [] };
	// Empty types array → guard returns false (length 0) → normal loop doesn't run → empty violations.
	expect(attrCheck(t, 'x-attr', 'anything', true, spec)).toStrictEqual([]);
});

test('[attr-check-issue-3685-004] array of Number is NOT treated as conditional', () => {
	const spec: AttrSpec = {
		name: 'count',
		type: [{ type: 'integer', gte: 0 }],
	};
	// '42' is a valid non-negative integer → early-return `false` (valid).
	expect(attrCheck(t, 'count', '42', true, spec)).toBe(false);
	// '-1' violates `gte: 0` → real violation reported (proves guard did NOT fire).
	const invalid = attrCheck(t, 'count', '-1', true, spec);
	expect(Array.isArray(invalid)).toBe(true);
	expect((invalid as readonly unknown[]).length).toBeGreaterThan(0);
});
