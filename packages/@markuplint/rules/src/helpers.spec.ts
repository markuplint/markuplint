import type { Translator } from '@markuplint/i18n';
import type { Attribute } from '@markuplint/ml-spec';

import { translator } from '@markuplint/i18n';
import { createTestElement } from '@markuplint/ml-core';
import { i18n } from 'markuplint';
import { test, expect, beforeAll } from 'vitest';

import * as jsxParser from '@markuplint/jsx-parser';

import { attrCheck } from './attr-check.js';
import { resolveAttrEligibility } from './attr-eligibility.js';
import {
	createIgnoreFeaturesLookup,
	createNameOptionLookup,
	createPrefixMatcher,
	findAttrSpec,
	isAriaAttr,
	memoizeByContent,
	memoizeByObject,
} from './helpers.js';

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

const attrsOf = (code: string, jsx = false) => {
	const el = createTestElement(code, jsx ? { parser: jsxParser } : undefined);
	return el.getAttributeTokens();
};

test('[helpers-issue-4309-001] findAttrSpec prefers the exact name and asks the attribute for another spelling', () => {
	const viewBox: Attribute = { name: 'viewBox', type: 'Any' };
	const klass: Attribute = { name: 'class', type: 'Any' };
	const specs = [klass, viewBox];
	// The HTML parser restores the case of a name of SVG; an SVG element that code sets keeps it
	expect(findAttrSpec(specs, attrsOf('<svg VIEWBOX></svg>')[0]!)).toBe(viewBox);
	expect(findAttrSpec(specs, attrsOf('<svg viewBox></svg>')[0]!)).toBe(viewBox);
	expect(findAttrSpec(specs, attrsOf('<svg VIEWBOX />', true)[0]!)).toBeUndefined();
	expect(findAttrSpec(specs, attrsOf('<svg viewBox />', true)[0]!)).toBe(viewBox);
	// An HTML element folds either way
	expect(findAttrSpec(specs, attrsOf('<div CLASS></div>')[0]!)).toBe(klass);
	expect(findAttrSpec(specs, attrsOf('<div CLASS />', true)[0]!)).toBe(klass);
	// A name of the framework with a capital letter is not folded into one of the DOM
	const defaultValue: Attribute = { name: 'defaultValue', type: 'Any' };
	expect(findAttrSpec([defaultValue], attrsOf('<input defaultvalue />', true)[0]!)).toBeUndefined();
});

test('[helpers-issue-4309-002] isAriaAttr reads the name that the DOM gives', () => {
	expect(isAriaAttr(attrsOf('<div ARIA-LABEL></div>')[0]!)).toBe(true);
	expect(isAriaAttr(attrsOf('<div ARIA-LABEL />', true)[0]!)).toBe(true);
	expect(isAriaAttr(attrsOf('<svg ARIA-LABEL />', true)[0]!)).toBe(false);
	expect(isAriaAttr(attrsOf('<div role></div>')[0]!)).toBe(false);
});

test('[helpers-issue-4309-003] createNameOptionLookup asks the attribute, and a later entry of a name wins', () => {
	const lookup = createNameOptionLookup<string>('Any');
	const upper = attrsOf('<div X-ATTR></div>')[0]!;
	const svg = attrsOf('<svg X-ATTR />', true)[0]!;
	expect(lookup(['x-attr'], upper)).toBe('Any');
	expect(lookup(['X-ATTR'], upper)).toBe('Any');
	expect(lookup([{ name: 'x-attr', value: 'Int' }], upper)).toBe('Int');
	expect(lookup(['x-attr', { name: 'X-ATTR', value: 'Int' }], upper)).toBe('Int');
	expect(lookup({ 'x-attr': 'Int' }, upper)).toBe('Int');
	expect(lookup(undefined, upper)).toBeUndefined();
	expect(lookup(['y-attr'], upper)).toBeUndefined();
	// The DOM keeps the name as written on an SVG element that code sets
	expect(lookup(['x-attr'], svg)).toBeUndefined();
	expect(lookup(['X-ATTR'], svg)).toBe('Any');
});

test('[helpers-issue-4309-004] createPrefixMatcher asks the attribute', () => {
	const matches = createPrefixMatcher();
	const upper = attrsOf('<div DATA-X></div>')[0]!;
	const svg = attrsOf('<svg DATA-X />', true)[0]!;
	expect(matches('data-', upper)).toBe(true);
	expect(matches(['aria-', 'data-'], upper)).toBe(true);
	expect(matches(undefined, upper)).toBe(false);
	expect(matches('aria-', upper)).toBe(false);
	expect(matches('data-', svg)).toBe(false);
});

test('[helpers-issue-4309-005] memoizeByObject and memoizeByContent build a value once', () => {
	let calls = 0;
	const byObject = memoizeByObject((names: readonly string[]) => {
		calls++;
		return names.length === 0 ? undefined : names.length;
	});
	const names = ['x'];
	expect(byObject(names)).toBe(1);
	expect(byObject(names)).toBe(1);
	const empty: string[] = [];
	expect(byObject(empty)).toBeUndefined();
	expect(byObject(empty)).toBeUndefined();
	expect(calls).toBe(2);

	let contentCalls = 0;
	const byContent = memoizeByContent((option: readonly string[]) => {
		contentCalls++;
		return option.length;
	});
	// The options of the elements of a `nodeRule` arrive as a copy for each element
	expect(byContent(['a', 'b'])).toBe(2);
	expect(byContent(['a', 'b'])).toBe(2);
	expect(byContent(['a\0b'])).toBe(1);
	expect(contentCalls).toBe(2);
});

test('[helpers-issue-4309-006] createIgnoreFeaturesLookup reads the element part by the case of tag names and the attribute part by the attribute', () => {
	const folding = createIgnoreFeaturesLookup(false, ['dialog', 'IMG[LOADING]', 'Input[list]']);
	const div = attrsOf('<div LOADING OPEN></div>');
	expect(folding.isElementIgnored(undefined, 'dialog')).toBe(true);
	expect(folding.isElementIgnored(undefined, 'DIALOG')).toBe(true);
	expect(folding.isElementIgnored(undefined, 'img')).toBe(false);
	expect(folding.isElementIgnored(undefined, 'span')).toBe(false);
	// An attribute key ignores the attribute, not the element
	expect(folding.isElementIgnored(['img[loading]'], 'img')).toBe(false);
	const img = attrsOf('<img LOADING list>');
	expect(folding.isAttrIgnored(undefined, 'img', img[0]!)).toBe(true);
	expect(folding.isAttrIgnored(undefined, 'IMG', img[0]!)).toBe(true);
	expect(folding.isAttrIgnored(undefined, 'img', img[1]!)).toBe(false);
	expect(folding.isAttrIgnored(undefined, 'input', attrsOf('<input LIST>')[0]!)).toBe(true);
	expect(folding.isAttrIgnored(undefined, 'div', div[0]!)).toBe(false);
	// An element option replaces the option of the rule, for both questions
	expect(folding.isElementIgnored(['span'], 'dialog')).toBe(false);
	expect(folding.isElementIgnored(['span'], 'span')).toBe(true);
	expect(folding.isAttrIgnored([], 'img', img[0]!)).toBe(false);
	expect(folding.isAttrIgnored(['img[list]'], 'img', img[1]!)).toBe(true);
	expect(folding.isAttrIgnored(['img[list]'], 'img', img[0]!)).toBe(false);

	const exact = createIgnoreFeaturesLookup(true, ['dialog', 'dialog[OPEN]', 'IMG']);
	expect(exact.isElementIgnored(undefined, 'dialog')).toBe(true);
	expect(exact.isElementIgnored(undefined, 'DIALOG')).toBe(false);
	expect(exact.isElementIgnored(undefined, 'img')).toBe(false);
	expect(exact.isElementIgnored(undefined, 'IMG')).toBe(true);
	expect(exact.isAttrIgnored(undefined, 'dialog', attrsOf('<dialog OPEN></dialog>')[0]!)).toBe(true);
	expect(exact.isAttrIgnored(undefined, 'DIALOG', attrsOf('<dialog OPEN></dialog>')[0]!)).toBe(false);
});

test('[helpers-issue-4309-007] createIgnoreFeaturesLookup asks the attribute whether its name is the key', () => {
	const lookup = createIgnoreFeaturesLookup(true, ['svg[viewBox]', 'svg[ROLE]', 'div[defaultValue]']);
	const svg = attrsOf('<svg viewBox ROLE role />', true);
	expect(lookup.isAttrIgnored(undefined, 'svg', svg[0]!)).toBe(true);
	expect(lookup.isAttrIgnored(undefined, 'svg', svg[1]!)).toBe(true);
	// `role` of an SVG element that code sets is not `ROLE`
	expect(lookup.isAttrIgnored(undefined, 'svg', svg[2]!)).toBe(false);
	// A prop of the framework on an HTML element is its exact spelling only
	const props = attrsOf('<div defaultvalue defaultValue></div>', true);
	expect(lookup.isAttrIgnored(undefined, 'div', props[0]!)).toBe(false);
	expect(lookup.isAttrIgnored(undefined, 'div', props[1]!)).toBe(true);
	// The HTML parser restores the case of a name of SVG
	const parsed = createIgnoreFeaturesLookup(false, ['svg[viewBox]']);
	expect(parsed.isAttrIgnored(undefined, 'svg', attrsOf('<svg VIEWBOX></svg>')[0]!)).toBe(true);
});

test('[helpers-issue-4309-008] createIgnoreFeaturesLookup gives a copy of an option the answer of the option', () => {
	const lookup = createIgnoreFeaturesLookup(false, ['dialog']);
	const attr = attrsOf('<div OPEN></div>')[0]!;
	// The options of the elements of a `nodeRule` arrive as a copy for each element
	expect(lookup.isElementIgnored(['span', 'a[b]'], 'span')).toBe(true);
	expect(lookup.isElementIgnored(['span', 'a[b]'], 'span')).toBe(true);
	expect(lookup.isAttrIgnored(['div[open]'], 'div', attr)).toBe(true);
	expect(lookup.isAttrIgnored(['div[open]'], 'div', attr)).toBe(true);
});

test('[helpers-issue-4309-009] createIgnoreFeaturesLookup parses the option once for every copy of its content', () => {
	let parsed = 0;
	// The parser walks the option with `for...of`, so the count is the number of times an option is read
	const copyOf = (features: readonly string[]) => {
		const copy = [...features];
		Object.defineProperty(copy, Symbol.iterator, {
			value: function* (this: string[]) {
				parsed++;
				yield* Array.prototype[Symbol.iterator].call(this);
			},
		});
		return copy;
	};
	const lookup = createIgnoreFeaturesLookup(false);
	const attr = attrsOf('<div OPEN></div>')[0]!;
	expect(lookup.isElementIgnored(copyOf(['span', 'div[open]']), 'span')).toBe(true);
	expect(lookup.isElementIgnored(copyOf(['span', 'div[open]']), 'span')).toBe(true);
	expect(lookup.isAttrIgnored(copyOf(['span', 'div[open]']), 'div', attr)).toBe(true);
	expect(parsed).toBe(1);
	expect(lookup.isElementIgnored(copyOf(['p']), 'p')).toBe(true);
	expect(parsed).toBe(2);
});

test('[helpers-issue-4309-010] findAttrSpec takes the first spec of a name that is listed twice', () => {
	const first: Attribute = { name: 'viewBox', type: 'Any' };
	const second: Attribute = { name: 'viewBox', type: 'Int' };
	const klassFirst: Attribute = { name: 'class', type: 'Any' };
	const klassSecond: Attribute = { name: 'class', type: 'Int' };
	const specs = [first, klassFirst, second, klassSecond];
	// The exact spelling
	expect(findAttrSpec(specs, attrsOf('<svg viewBox></svg>')[0]!)).toBe(first);
	expect(findAttrSpec(specs, attrsOf('<div class></div>')[0]!)).toBe(klassFirst);
	// Another spelling that the DOM makes the same attribute
	expect(findAttrSpec(specs, attrsOf('<svg VIEWBOX></svg>')[0]!)).toBe(first);
	expect(findAttrSpec(specs, attrsOf('<div CLASS></div>')[0]!)).toBe(klassFirst);
});

test('[helpers-issue-4309-011] createNameOptionLookup prefers the entry written as the attribute and otherwise the last one', () => {
	const lookup = createNameOptionLookup<string>('Any');
	const upper = attrsOf('<div X-ATTR></div>')[0]!;
	// The entry spelled as the attribute wins, whichever side of the other spelling it stands
	expect(lookup(['X-ATTR', { name: 'x-attr', value: 'Int' }], upper)).toBe('Any');
	expect(lookup([{ name: 'x-attr', value: 'Int' }, 'X-ATTR'], upper)).toBe('Any');
	// Without one, the last entry that the attribute says it is wins
	expect(lookup(['x-attr', { name: 'X-Attr', value: 'Int' }], upper)).toBe('Int');
	expect(lookup([{ name: 'X-Attr', value: 'Int' }, 'x-attr'], upper)).toBe('Any');
});
