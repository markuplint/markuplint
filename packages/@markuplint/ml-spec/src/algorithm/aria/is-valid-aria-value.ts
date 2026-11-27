import type { ARIAAttributeValue, ARIAProperty } from '../../types/index.js';

import {
	asciiLowerCase,
	isValidFloatingPointNumber,
	isValidInteger,
	splitOnAsciiWhitespace,
	trimAsciiWhitespace,
} from '@markuplint/shared';

/**
 * Whether the value of an ARIA attribute is a valid one for its property: the one reader of an ARIA value, which
 * the computed ARIA props (`getComputedAriaProps`, whether the attribute or the default is the computed one) and the
 * `no-invalid-aria-prop-value` rule of `@markuplint/rules` both call, so that one value has one answer.
 *
 * The value type is that of the property, or the one that the property declares for the role
 * (`conditionalValue`). When the role is not known until it is rendered (`roleUnknown`), the value is valid if the
 * type of the property or the type of any role that has its own allows it, as the role that decides is not known.
 *
 * An empty value (`""`, or ASCII white space only) is valid for a property that the role does not require: user
 * agents treat it as the absent attribute. For a required one it is an author error:
 *
 * > Authors MAY specify a zero-length string ("") for any supported (but not required) state or property.
 *
 * WAI-ARIA defines the value types and says nothing of the case of a value or of the white space around it, and
 * user agents differ on the case (the ACT rule 6a7281, ARIA state or property has valid value, notes so). The reading here
 * is the one of the other readers of a value of HTML in markuplint: ASCII white space around the value is trimmed,
 * a keyword (`true/false`, `tristate`, `true/false/undefined`, `token`, the tokens of `token list`) is compared
 * ASCII case-insensitively, and an `integer` or a `number` is the whole of the trimmed value (see
 * {@link isValidAriaValueType}). Of the value types that the property declares for roles (`conditionalValue`), the
 * first one whose roles include the role is the type.
 *
 * @see https://w3c.github.io/aria/#state_property_processing
 * @see https://w3c.github.io/aria/#propcharacteristic_value
 * @see https://act-rules.github.io/rules/6a7281
 * @param spec - The ARIA property specification
 * @param value - The attribute value as written
 * @param role - The name of the computed role, which resolves a role's own value type
 * @param roleUnknown - Whether the role is not known until it is rendered
 * @param required - Whether the role requires the property, which makes an empty value an author error
 * @returns `true` if the value is valid for the property
 */
export function isValidAriaValue(
	spec: ARIAProperty,
	value: string,
	role?: string | null,
	roleUnknown = false,
	required = false,
): boolean {
	if (trimAsciiWhitespace(value) === '') {
		return !required;
	}
	if (roleUnknown) {
		return (
			isValidAriaValueType(spec.value, value, spec.enum) ||
			(spec.conditionalValue?.some(cond => isValidAriaValueType(cond.value, value, spec.enum)) ?? false)
		);
	}
	const type =
		(role ? spec.conditionalValue?.find(cond => cond.role.includes(role))?.value : undefined) ?? spec.value;
	return isValidAriaValueType(type, value, spec.enum);
}

/**
 * Whether a value is a valid one of an ARIA value type, read as {@link isValidAriaValue} says.
 *
 * - `true/false`: `true`, `false`. `tristate`: `true`, `false`, `mixed`, `undefined` (quoted below).
 *   `true/false/undefined`: `true`, `false`, `undefined`.
 * - `token`: one of the allowed values; `token list`: a list of them separated by ASCII white space, at least one.
 * - `integer` / `number`: the whole value against the grammar of HTML (`isValidInteger`,
 *   `isValidFloatingPointNumber` of `@markuplint/shared`), as WAI-ARIA defines no syntax of its own.
 * - `ID reference`: one id, which has no ASCII white space; `ID reference list`, `URI`: a value that is not empty.
 * - `string`: any value.
 *
 * An empty value is not valid for a type that needs a value; whether the property may be empty is
 * {@link isValidAriaValue}'s to say. A `token` or `token list` whose list of allowed values is empty (spec data
 * without one) allows no value.
 *
 * > Value representing true, false, mixed, or undefined values.
 *
 * @see https://w3c.github.io/aria/#valuetype_tristate
 * @param type - The ARIA value type
 * @param value - The attribute value as written
 * @param tokens - The allowed values of a `token` or a `token list`
 * @returns `true` if the value is valid for the type
 */
export function isValidAriaValueType(type: ARIAAttributeValue, value: string, tokens: readonly string[]): boolean {
	const trimmed = trimAsciiWhitespace(value);
	switch (type) {
		case 'string': {
			return true;
		}
		case 'ID reference': {
			// One id: an id has no ASCII white space
			return trimmed !== '' && splitOnAsciiWhitespace(trimmed).length === 1;
		}
		case 'ID reference list':
		case 'URI': {
			return trimmed !== '';
		}
		case 'integer': {
			return isValidInteger(trimmed);
		}
		case 'number': {
			return isValidFloatingPointNumber(trimmed);
		}
		case 'token': {
			return tokens.includes(asciiLowerCase(trimmed));
		}
		case 'token list': {
			const list = splitOnAsciiWhitespace(value);
			return list.length > 0 && list.every(token => tokens.includes(asciiLowerCase(token)));
		}
		case 'true/false': {
			return ['true', 'false'].includes(asciiLowerCase(trimmed));
		}
		case 'tristate': {
			return ['true', 'false', 'mixed', 'undefined'].includes(asciiLowerCase(trimmed));
		}
		case 'true/false/undefined': {
			return ['true', 'false', 'undefined'].includes(asciiLowerCase(trimmed));
		}
		default: {
			// A value type of spec data that this does not know is not checked
			return true;
		}
	}
}
