import type { ARIAProperty } from '../../types/index.js';

import specs from '@markuplint/html-spec';
import { createSelector } from '@markuplint/selector';
import { createJSDOMElement } from '@markuplint/test-tools';
import { describe, test, expect } from 'vitest';

import { ariaSpecs } from './aria-specs.js';
import { getComputedAriaProps } from './get-computed-aria-props.js';
import { isValidAriaValue, isValidAriaValueType } from './is-valid-aria-value.js';

/**
 * One table that both readers of an ARIA value run: the validator itself and the computed ARIA props, whose value is
 * taken from the attribute exactly when the value is valid and not empty. `[no-invalid-aria-prop-value-023]` of
 * `@markuplint/rules` runs the same rows through the rule.
 *
 * Rows: the role, the attribute, the value, whether it is valid, where the computed prop takes its value from. The
 * ACT rule "ARIA state or property has valid value" gives the cases of `mixed`, `undefined`, `2.5`, `1.0` and the
 * tokens.
 *
 * @see https://act-rules.github.io/rules/6a7281
 */
const table: readonly (readonly [
	role: string,
	attr: string,
	value: string,
	valid: boolean,
	from: 'aria-attr' | 'default',
])[] = [
	['checkbox', 'aria-checked', 'true', true, 'aria-attr'],
	['checkbox', 'aria-checked', ' TRUE ', false, 'default'],
	['checkbox', 'aria-checked', 'TRUE', true, 'aria-attr'],
	['checkbox', 'aria-checked', ' true ', false, 'default'],
	['checkbox', 'aria-checked', ' true', false, 'default'],
	['checkbox', 'aria-checked', 'mixed', true, 'aria-attr'],
	['slider', 'aria-valuenow', ' 5 ', true, 'aria-attr'],
	['heading', 'aria-level', ' 3 ', true, 'aria-attr'],
	['button', 'aria-pressed', 'undefined', true, 'aria-attr'],
	['button', 'aria-pressed', 'mixed', true, 'aria-attr'],
	['button', 'aria-expanded', 'mixed', false, 'default'],
	['textbox', 'aria-required', 'undefined', false, 'default'],
	['gridcell', 'aria-rowindex', '2.5', false, 'default'],
	['spinbutton', 'aria-valuemin', '1.0', true, 'aria-attr'],
	['region', 'aria-live', 'POLITE', true, 'aria-attr'],
	['region', 'aria-live', 'nope', false, 'default'],
	['region', 'aria-relevant', 'ADDITIONS text', true, 'aria-attr'],
	['region', 'aria-relevant', 'additions nope', false, 'default'],
	['textbox', 'aria-activedescendant', 'a', true, 'aria-attr'],
	['textbox', 'aria-activedescendant', 'a b', false, 'default'],
];

/**
 * @param name - The name of an ARIA property
 * @returns Its spec of ARIA 1.3
 */
function propSpec(name: string): ARIAProperty {
	const spec = ariaSpecs(specs, '1.3').props.find(p => p.name === name);
	if (!spec) {
		throw new Error(`No ARIA property ${name}`);
	}
	return spec;
}

describe('isValidAriaValue', () => {
	test.each(table)('of %s %s=%j is %j', (role, attr, value, valid) => {
		expect(isValidAriaValue(propSpec(attr), value, role)).toBe(valid);
	});

	test.each([
		['', false, true],
		[' ', false, false],
		['', true, false],
		[' ', true, false],
	])('of the zero-length value or white space %j, required %j, is %j', (value, required, valid) => {
		expect(isValidAriaValue(propSpec('aria-checked'), value, 'checkbox', false, required)).toBe(valid);
	});

	test.each([
		// `mixed` is a value of `tristate`, the type of `checkbox` (`conditionalValue`), not of `true/false`, the base type
		['mixed', true],
		// `true` is a value of the base type
		['true', true],
		['nope', false],
	])('of a role that is not known is valid if any value type of the property allows it: %j', (value, valid) => {
		expect(isValidAriaValue(propSpec('aria-checked'), value, null, true)).toBe(valid);
	});

	test('of a role that two role-specific value types name takes the first', () => {
		const spec: ARIAProperty = {
			name: 'aria-x',
			type: 'state',
			value: 'string',
			conditionalValue: [
				{ role: ['r'], value: 'true/false' },
				{ role: ['r'], value: 'tristate' },
			],
			enum: [],
		};
		expect(isValidAriaValue(spec, 'mixed', 'r')).toBe(false);
	});
});

describe('the role-specific value types of the spec data', () => {
	test.each(['1.1', '1.2', '1.3'] as const)(
		'of ARIA %s name each role once per property, so the first match is the only one',
		version => {
			for (const prop of ariaSpecs(specs, version).props) {
				const roles = (prop.conditionalValue ?? []).flatMap(cond => cond.role);
				expect(new Set(roles).size).toBe(roles.length);
			}
		},
	);
});

describe('isValidAriaValueType', () => {
	test.each([
		['token list', 'copy move', true],
		['token list', 'COPY move', true],
		['token list', 'invalid move', false],
		['token list', '', false],
		['ID reference', 'a', true],
		['ID reference', ' a ', true],
		['ID reference', 'a b', false],
		// U+00A0 is a character of an id
		['ID reference', 'a b', true],
		['ID reference list', 'a b', true],
		['URI', '', false],
		['string', '', true],
	] as const)('%s %j is %j', (type, value, valid) => {
		expect(isValidAriaValueType(type, value, ['copy', 'move', 'none'])).toBe(valid);
	});

	test('of a value type that it does not know is valid, as it is not checked', () => {
		expect(isValidAriaValueType('unknown' as ARIAProperty['value'], 'x', [])).toBe(true);
	});
});

describe('the computed ARIA props of the same table', () => {
	function propOf(role: string, attr: string, value: string) {
		const el = createJSDOMElement(
			`<div role="${role}" aria-label="x" ${attr}="${value}"></div>`,
			undefined,
			function (selector) {
				// JSDOM supports no level 4 selectors yet.
				return createSelector(selector, specs).match(this) !== false;
			},
		);
		return getComputedAriaProps(specs, el, '1.3')[attr];
	}

	test.each(table)('of %s %s=%j take the attribute when it is valid (%j: %s)', (role, attr, value, _valid, from) => {
		expect(propOf(role, attr, value)?.from).toBe(from);
	});

	test.each([
		['button', 'aria-pressed', '', 'default'],
		['slider', 'aria-valuetext', '', 'default'],
		['slider', 'aria-valuetext', ' ', 'aria-attr'],
		['checkbox', 'aria-checked', '', 'default'],
	])('of the zero-length value is the default, as the absent attribute: %s %s=%j (%s)', (role, attr, value, from) => {
		expect(propOf(role, attr, value)?.from).toBe(from);
	});
});
