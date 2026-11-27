import type { Options } from '../types.js';
import type { AttrChecker } from '@markuplint/ml-core';
import type { ARIAAttributeValue, ARIAProperty, ARIARole } from '@markuplint/ml-spec';

import { isValidAriaValue, isValidAriaValueType } from '@markuplint/ml-spec';

import { noTranslate } from '../../no-translate.js';

/**
 * Checks whether the value of an ARIA property or state conforms to its expected type, as
 * `isValidAriaValue` of `@markuplint/ml-spec` reads it (the reader that the computed ARIA props share): an
 * empty value is the absent attribute, valid unless the element requires the property (`requiredProps`).
 *
 * @param attr - The ARIA attribute node to inspect.
 * @param role - The computed ARIA role, used to resolve conditional value types.
 * @param roleUnknown - The result of `isRoleUnknown` of `../../helpers.js`: the role is not known until it is
 *   rendered (see `isValidAriaValue`); no property is then known to be required.
 * @param requiredProps - The properties that the element requires (`requiredPropsOf` of `./required-prop.js`).
 * @param propSpecs - The list of ARIA property specifications for value type lookup.
 * @returns A violation if the attribute value does not match the expected type.
 */
export const checkingValue: AttrChecker<
	boolean,
	Options,
	{
		role?: ARIARole | null;
		roleUnknown?: boolean;
		requiredProps?: readonly string[];
		propSpecs: readonly ARIAProperty[];
	}
> =
	({ attr, role, roleUnknown, requiredProps = [], propSpecs }) =>
	t => {
		if (attr.isDynamicValue) {
			return;
		}
		const propSpec = propSpecs.find(p => p.name === attr.nameKey);

		// An empty value is the absent attribute, which is an author error for a property the element requires
		const required = !roleUnknown && requiredProps.includes(attr.nameKey);
		// The computed role of an element whose role is not known is the fallback one, which is not the role it has
		const result = checkAria(propSpec, attr.value, roleUnknown ? undefined : role?.name, roleUnknown, required);
		if (result.isValid) {
			return;
		}
		return {
			scope: attr,
			message:
				t(
					'{0:c} on {1}',
					t('{0} is {1:c}', t('the "{0*}"', attr.value), 'disallowed'),
					t('the "{0*}" {1}', attr.name, `ARIA ${propSpec?.type ?? 'property'}`),
				) +
				('enum' in result && result.enum.length > 0
					? t('. ') + t('Allowed values are: {0}', t(result.enum.map(noTranslate)))
					: ''),
		};
	};

/**
 * Validates an ARIA property value against its specification, considering role-specific conditional types.
 *
 * @param propSpec - The ARIA property specification, or `undefined` if the property is unknown.
 * @param currentValue - The current attribute value to validate.
 * @param role - The name of the computed role, used to resolve conditional value types.
 * @param roleUnknown - Whether the role is not known; every value type of the property is then a candidate.
 * @param required - Whether the role requires the property: an empty value is then an author error.
 * @returns An object containing the validation result and, for enum types, the allowed values.
 */
function checkAria(
	propSpec: ARIAProperty | undefined,
	currentValue: string,
	role?: string,
	roleUnknown = false,
	required = false,
) {
	if (!propSpec) {
		return {
			currentValue,
			// For skipping checking
			isValid: true,
		};
	}
	return {
		...propSpec,
		currentValue,
		isValid: isValidAriaValue(propSpec, currentValue, role, roleUnknown, required),
	};
}

/**
 * Whether a value is valid for an ARIA value type: `isValidAriaValueType` of `@markuplint/ml-spec`, the one reader
 * of an ARIA value that the computed ARIA props read too. A type that it does not know is valid (no check). Kept
 * for its unit tests (`value.spec.ts`), which pin the reading of each value type here as well.
 *
 * @see https://w3c.github.io/aria/#propcharacteristic_value
 * @param type - The ARIA value type (e.g., `"token"`, `"true/false"`, `"integer"`).
 * @param value - The attribute value as written.
 * @param tokenEnum - The list of allowed token values for token-based types.
 * @returns `true` if the value is valid for the given type, `false` otherwise.
 */
export function checkAriaValue(type: string, value: string, tokenEnum: readonly string[]) {
	return isAriaValueType(type) ? isValidAriaValueType(type, value, tokenEnum) : true;
}

// A `Record` of every member, so that a value type that `ARIAAttributeValue` gains is a type error here
const ARIA_VALUE_TYPES: ReadonlySet<string> = new Set(
	Object.keys({
		'true/false': true,
		tristate: true,
		'true/false/undefined': true,
		'ID reference': true,
		'ID reference list': true,
		integer: true,
		number: true,
		string: true,
		token: true,
		'token list': true,
		URI: true,
	} satisfies Record<ARIAAttributeValue, true>),
);

/**
 * @param type - A value type as the spec data has it
 * @returns `true` if it is one of the ARIA value types
 */
function isAriaValueType(type: string): type is ARIAAttributeValue {
	return ARIA_VALUE_TYPES.has(type);
}
