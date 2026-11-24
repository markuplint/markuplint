import type { Translator } from '@markuplint/i18n';
import type { Attribute, ExtendedSpec, MLMLSpec } from '@markuplint/ml-spec';

import htmlSpec from '@markuplint/html-spec';
import { translator } from '@markuplint/i18n';
import { ariaSpecs, createTestDocument, createTestElement, getComputedRole } from '@markuplint/ml-core';
import { schemaToSpec } from '@markuplint/ml-spec';
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
	isFlagCheckedElement,
	isRoleUnknown,
	mayMatchContextRole,
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
 * Integration tests for `resolveAttrEligibility` with ConditionalAttributeType[].
 *
 * These exercise the boundary where the spec-validating rules (`no-unknown-attr`,
 * `no-disallowed-attr`, `no-invalid-attr-value`) meet the attribute spec data.
 * `resolveAttrEligibility` resolves `ConditionalAttributeType[]` by matching the
 * element against each condition. Enum matches are validated against their
 * intersection. Any other overlap is validated against the first match. If no
 * condition matches, it falls back to `Any`.
 */
test('falls back to Any when no condition matches', () => {
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

test('still reports violations for regular AttributeType[] specs', () => {
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

test('does not crash when attribute is absent from a conditional spec', () => {
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
 * Conditional type resolution tests.
 */
test('resolves condition and validates: valid simple color', () => {
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

test('resolves condition and validates: a CSS color keyword', () => {
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
	expect(result).toBe(false);
});

test('resolves second condition: valid URL', () => {
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

test('resolves second condition: invalid URL', () => {
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

test('unmatched type falls back to Any', () => {
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

test('case-insensitive condition matching', () => {
	const el = createTestElement('<input type="COLOR" value="red">');
	const attrSpecs: readonly Attribute[] = [
		{
			name: 'value',
			type: [{ condition: "[type='color' i]", type: 'SimpleColor' }],
		},
	];
	const result = checkValue('value', 'red', false, el, attrSpecs);
	// type=COLOR matches [type='color' i] → validates as SimpleColor → "red" is a valid CSS color.
	expect(result).toBe(false);
});

test('array condition (OR logic)', () => {
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

test('isDynamicValue suppresses invalid-value after conditional resolution', () => {
	const el = createTestElement('<input type="color" value="red">');
	const attrSpecs: readonly Attribute[] = [
		{
			name: 'value',
			type: [{ condition: "[type='color' i]", type: 'SimpleColor' }],
		},
	];
	// "red" is a valid CSS color, so this no longer exercises the suppression: the test "isDynamicValue suppresses invalid-value for a value that is no CSS color" does.
	const result = checkValue('value', 'red', true, el, attrSpecs);
	expect(result).toBe(false);
});

test('a value that is no CSS color is invalid for type=color', () => {
	const el = createTestElement('<input type="color" value="not-a-color">');
	const attrSpecs: readonly Attribute[] = [
		{
			name: 'value',
			type: [{ condition: "[type='color' i]", type: 'SimpleColor' }],
		},
	];
	expect(checkValue('value', 'not-a-color', false, el, attrSpecs)).not.toBe(false);
});

test('isDynamicValue suppresses invalid-value for a value that is no CSS color', () => {
	const el = createTestElement('<input type="color" value="not-a-color">');
	const attrSpecs: readonly Attribute[] = [
		{
			name: 'value',
			type: [{ condition: "[type='color' i]", type: 'SimpleColor' }],
		},
	];
	expect(checkValue('value', 'not-a-color', true, el, attrSpecs)).toBe(false);
});

const attrsOf = (code: string, jsx = false) => {
	const el = createTestElement(code, jsx ? { parser: jsxParser } : undefined);
	return el.getAttributeTokens();
};

test('findAttrSpec prefers the exact name and asks the attribute for another spelling', () => {
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

test('isAriaAttr reads the name that the DOM gives', () => {
	expect(isAriaAttr(attrsOf('<div ARIA-LABEL></div>')[0]!)).toBe(true);
	expect(isAriaAttr(attrsOf('<div ARIA-LABEL />', true)[0]!)).toBe(true);
	expect(isAriaAttr(attrsOf('<svg ARIA-LABEL />', true)[0]!)).toBe(false);
	expect(isAriaAttr(attrsOf('<div role></div>')[0]!)).toBe(false);
});

test('createNameOptionLookup asks the attribute, and a later entry of a name wins', () => {
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

test('createPrefixMatcher asks the attribute', () => {
	const matches = createPrefixMatcher();
	const upper = attrsOf('<div DATA-X></div>')[0]!;
	const svg = attrsOf('<svg DATA-X />', true)[0]!;
	expect(matches('data-', upper)).toBe(true);
	expect(matches(['aria-', 'data-'], upper)).toBe(true);
	expect(matches(undefined, upper)).toBe(false);
	expect(matches('aria-', upper)).toBe(false);
	expect(matches('data-', svg)).toBe(false);
});

test('memoizeByObject and memoizeByContent build a value once', () => {
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

test('createIgnoreFeaturesLookup reads the element part by the case of tag names and the attribute part by the attribute', () => {
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

test('createIgnoreFeaturesLookup asks the attribute whether its name is the key', () => {
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

test('createIgnoreFeaturesLookup gives a copy of an option the answer of the option', () => {
	const lookup = createIgnoreFeaturesLookup(false, ['dialog']);
	const attr = attrsOf('<div OPEN></div>')[0]!;
	// The options of the elements of a `nodeRule` arrive as a copy for each element
	expect(lookup.isElementIgnored(['span', 'a[b]'], 'span')).toBe(true);
	expect(lookup.isElementIgnored(['span', 'a[b]'], 'span')).toBe(true);
	expect(lookup.isAttrIgnored(['div[open]'], 'div', attr)).toBe(true);
	expect(lookup.isAttrIgnored(['div[open]'], 'div', attr)).toBe(true);
});

test('createIgnoreFeaturesLookup parses the option once for every copy of its content', () => {
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
	// @ts-expect-error The rule option is omitted on purpose
	const lookup = createIgnoreFeaturesLookup(false);
	const attr = attrsOf('<div OPEN></div>')[0]!;
	expect(lookup.isElementIgnored(copyOf(['span', 'div[open]']), 'span')).toBe(true);
	expect(lookup.isElementIgnored(copyOf(['span', 'div[open]']), 'span')).toBe(true);
	expect(lookup.isAttrIgnored(copyOf(['span', 'div[open]']), 'div', attr)).toBe(true);
	expect(parsed).toBe(1);
	expect(lookup.isElementIgnored(copyOf(['p']), 'p')).toBe(true);
	expect(parsed).toBe(2);
});

test('findAttrSpec takes the first spec of a name that is listed twice', () => {
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

test('createNameOptionLookup prefers the entry written as the attribute and otherwise the last one', () => {
	const lookup = createNameOptionLookup<string>('Any');
	const upper = attrsOf('<div X-ATTR></div>')[0]!;
	// The entry spelled as the attribute wins, whichever side of the other spelling it stands
	expect(lookup(['X-ATTR', { name: 'x-attr', value: 'Int' }], upper)).toBe('Any');
	expect(lookup([{ name: 'x-attr', value: 'Int' }, 'X-ATTR'], upper)).toBe('Any');
	// Without one, the last entry that the attribute says it is wins
	expect(lookup(['x-attr', { name: 'X-Attr', value: 'Int' }], upper)).toBe('Int');
	expect(lookup([{ name: 'X-Attr', value: 'Int' }, 'x-attr'], upper)).toBe('Any');
});

test('isFlagCheckedElement looks at an element of HTML, SVG and MathML, and not at a component that no pretender stands for', () => {
	expect(isFlagCheckedElement(createTestElement('<div></div>'))).toBe(true);
	expect(isFlagCheckedElement(createTestElement('<svg></svg>'))).toBe(true);
	expect(isFlagCheckedElement(createTestElement('<math></math>'))).toBe(true);
	expect(isFlagCheckedElement(createTestElement('<x-foo></x-foo>'))).toBe(false);
	expect(
		isFlagCheckedElement(
			createTestElement('<x-iframe></x-iframe>', {
				pretenders: [{ selector: 'x-iframe', as: { element: 'iframe', inheritAttrs: true } }],
			}),
		),
	).toBe(true);
});

test('isFlagCheckedElement looks at a component that a pretender makes stand for an SVG or a MathML element', () => {
	const parser = { parser: jsxParser };
	expect(isFlagCheckedElement(createTestElement('<Icon />', parser))).toBe(false);
	expect(
		isFlagCheckedElement(
			createTestElement('<Icon />', { ...parser, pretenders: [{ selector: 'Icon', as: 'svg' }] }),
		),
	).toBe(true);
	expect(
		isFlagCheckedElement(
			createTestElement('<Formula />', { ...parser, pretenders: [{ selector: 'Formula', as: 'mfenced' }] }),
		),
	).toBe(true);
});

test('isRoleUnknown is true for a role that code gives, and for a spread attribute without a role', () => {
	const parser = { parser: jsxParser };
	expect(isRoleUnknown(createTestElement('<div role={props.role} />', parser))).toBe(true);
	expect(isRoleUnknown(createTestElement('<div {...props} />', parser))).toBe(true);
});

test('isRoleUnknown is false for a role that the markup tells, and for a role that the framework does not output', () => {
	const parser = { parser: jsxParser };
	expect(isRoleUnknown(createTestElement('<div />', parser))).toBe(false);
	expect(isRoleUnknown(createTestElement('<div role="button" />', parser))).toBe(false);
	expect(isRoleUnknown(createTestElement('<div {...props} role="button" />', parser))).toBe(false);
	expect(isRoleUnknown(createTestElement('<div role={undefined} />', parser))).toBe(false);
	expect(isRoleUnknown(createTestElement('<div role="button"></div>'))).toBe(false);
});

test('isRoleUnknown scans the whole attribute list where the role is not output', () => {
	const parser = { parser: jsxParser };
	expect(isRoleUnknown(createTestElement('<div role={undefined} {...props} />', parser))).toBe(true);
	expect(isRoleUnknown(createTestElement('<div {...props} role={undefined} />', parser))).toBe(true);
});

test('isRoleUnknown reads a binding and an object that Vue binds', async () => {
	const parser = (await import('@markuplint/vue-parser')).parser;
	const specs = schemaToSpec([
		htmlSpec as unknown as MLMLSpec,
		(await import('@markuplint/vue-spec')).default as ExtendedSpec,
	]);
	const isUnknown = (attrs: string) => {
		const el = createTestDocument(`<template><div ${attrs}></div></template>`, { parser, specs }).querySelector(
			'div',
		);
		return el ? isRoleUnknown(el) : null;
	};
	expect(isUnknown(':role="r"')).toBe(true);
	expect(isUnknown('v-bind:role="r"')).toBe(true);
	expect(isUnknown('v-bind="props"')).toBe(true);
	expect(isUnknown('role="button" v-bind="props"')).toBe(true);
	expect(isUnknown('v-bind="props" role="button"')).toBe(false);
	expect(isUnknown('role="button" :id="a"')).toBe(false);
	expect(isUnknown(':id="a"')).toBe(false);
});

test('isRoleUnknown is true for a spread attribute after the role attribute, and false before it', () => {
	const parser = { parser: jsxParser };
	expect(isRoleUnknown(createTestElement('<div role="button" {...props} />', parser))).toBe(true);
	expect(isRoleUnknown(createTestElement('<div {...props} role="button" />', parser))).toBe(false);
});

test('isRoleUnknown reads the attributes of the element that a pretender makes stand for the component', () => {
	const parser = { parser: jsxParser };
	const as = { element: 'div', inheritAttrs: true };
	// The spread is an attribute of the pretended element only where it inherits the attributes
	expect(
		isRoleUnknown(createTestElement('<X {...props} />', { ...parser, pretenders: [{ selector: 'X', as }] })),
	).toBe(true);
	expect(
		isRoleUnknown(createTestElement('<X {...props} />', { ...parser, pretenders: [{ selector: 'X', as: 'div' }] })),
	).toBe(false);
	expect(
		isRoleUnknown(createTestElement('<X role="button" />', { ...parser, pretenders: [{ selector: 'X', as }] })),
	).toBe(false);
});

test('mayMatchContextRole agrees with getComputedRole where no ancestor has a role that is not known', () => {
	const sources = [
		'<div><div role="listitem"></div></div>',
		'<div role="list"><div role="listitem"></div></div>',
		'<div role="list"><div role="presentation"><div role="listitem"></div></div></div>',
		'<div role="list"><div><div role="listitem"></div></div></div>',
		'<div role="group"><div role="menuitem"></div></div>',
		'<div role="menu"><div role="group"><div role="menuitem"></div></div></div>',
		'<div role="menubar"><div role="menuitem"></div></div>',
		'<div role="list"><div role="group"><div role="menuitem"></div></div></div>',
		'<div role="listbox"><div role="group"><div role="option"></div></div></div>',
		'<div role="tree"><div role="treeitem"></div></div>',
	];
	const compare = (version: '1.1' | '1.2' | '1.3') =>
		sources.flatMap(source => {
			const document = createTestDocument(source);
			const { roles } = ariaSpecs(document.specs, version);
			return [...document.querySelectorAll('[role]')].flatMap(el => {
				const required =
					roles.find(r => r.name === el.getAttrValue('role'))?.requiredAccessibilityParentRole ?? [];
				if (required.length === 0) {
					return [];
				}
				return [
					{
						source,
						matches: mayMatchContextRole(el, required, document.specs, version),
						accepted: getComputedRole(document.specs, el, version).role !== null,
					},
				];
			});
		});
	for (const version of ['1.1', '1.2', '1.3'] as const) {
		const results = compare(version);
		// The trees give both answers, so that all-true or all-false cannot pass
		expect(new Set(results.map(r => r.accepted))).toStrictEqual(new Set([true, false]));
		expect(results.map(({ source, matches }) => ({ source, matches }))).toStrictEqual(
			results.map(({ source, accepted }) => ({ source, matches: accepted })),
		);
	}
});
