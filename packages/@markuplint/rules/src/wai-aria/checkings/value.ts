import type { Options } from '../types.js';
import type { AttrChecker } from '@markuplint/ml-core';
import type { ARIAProperty, ARIARole } from '@markuplint/ml-spec';

/**
 * Checks whether the value of an ARIA property or state conforms to its expected type.
 *
 * ARIA properties have specific value types (token, token list, true/false, tristate,
 * integer, number, string, ID reference, etc.). This checker validates the attribute
 * value against the property's expected type and allowed enum values.
 * Role-specific conditional value types are also considered.
 *
 * @param attr - The ARIA attribute node to inspect.
 * @param role - The computed ARIA role, used to resolve conditional value types.
 * @param propSpecs - The list of ARIA property specifications for value type lookup.
 * @param booleanish - Whether the document supports booleanish attribute values (e.g., JSX).
 * @returns A violation if the attribute value does not match the expected type.
 */
export const checkingValue: AttrChecker<
	boolean,
	Options,
	{
		role?: ARIARole | null;
		propSpecs: readonly ARIAProperty[];
		booleanish?: boolean;
	}
> =
	({ attr, role, propSpecs, booleanish }) =>
	t => {
		if (attr.isDynamicValue) {
			return;
		}
		const propSpec = propSpecs.find(p => p.name === attr.name);

		const result = checkAria(propSpec, attr.value, role?.name, booleanish);
		if (result.isValid) {
			return;
		}
		return {
			scope: attr,
			message:
				t(
					'{0:c} on {1}',
					t('{0} is {1:c}', t('the "{0}"', attr.value), 'disallowed'),
					t('the "{0*}" {1}', attr.name, `ARIA ${propSpec?.type ?? 'property'}`),
				) +
				('enum' in result && result.enum.length > 0
					? t('. ') + t('Allowed values are: {0}', t(result.enum))
					: ''),
		};
	};

/**
 * Validates an ARIA property value against its specification, considering role-specific conditional types.
 *
 * @param propSpec - The ARIA property specification, or `undefined` if the property is unknown.
 * @param currentValue - The current attribute value to validate.
 * @param role - The name of the computed role, used to resolve conditional value types.
 * @param booleanish - Whether booleanish values (empty string as `true`) are accepted.
 * @returns An object containing the validation result and, for enum types, the allowed values.
 */
function checkAria(propSpec: ARIAProperty | undefined, currentValue: string, role?: string, booleanish?: boolean) {
	if (!propSpec) {
		return {
			currentValue,
			// For skipping checking
			isValid: true,
		};
	}

	let valueType = propSpec.value;
	if (role && propSpec.conditionalValue) {
		for (const cond of propSpec.conditionalValue) {
			if (cond.role.includes(role)) {
				valueType = cond.value;
				break;
			}
		}
	}
	const isValid = checkAriaValue(valueType, currentValue, propSpec.enum, booleanish);
	return {
		...propSpec,
		currentValue,
		isValid,
	};
}

/**
 * Validates a raw ARIA value against the expected value type defined in the specification.
 *
 * Supports token, token list, string, ID reference, true/false, tristate,
 * true/false/undefined, integer, and number value types.
 *
 * @see https://www.w3.org/TR/wai-aria-1.2/#propcharacteristic_value
 * @param type - The ARIA value type (e.g., `"token"`, `"true/false"`, `"integer"`).
 * @param value - The raw attribute value to validate.
 * @param tokenEnum - The list of allowed token values for token-based types.
 * @param booleanish - Whether empty string is accepted as a boolean `true` value.
 * @returns `true` if the value is valid for the given type, `false` otherwise.
 */
export function checkAriaValue(type: string, value: string, tokenEnum: readonly string[], booleanish?: boolean) {
	switch (type) {
		case 'token': {
			return tokenEnum.includes(value);
		}
		case 'token list': {
			const list = value.split(/\s+/).map(s => s.trim());
			return list.every(token => tokenEnum.includes(token));
		}
		case 'string':
		case 'ID reference':
		case 'ID reference list': {
			return true;
		}
		case 'true/false': {
			if (booleanish && value === '') {
				return true;
			}
			return ['true', 'false'].includes(value);
		}
		case 'tristate': {
			if (booleanish && value === '') {
				return true;
			}
			return ['mixed', 'true', 'false', 'undefined'].includes(value);
		}
		case 'true/false/undefined': {
			if (booleanish && value === '') {
				return true;
			}
			return ['true', 'false', 'undefined'].includes(value);
		}
		case 'integer': {
			return Number.parseInt(value).toString() === value;
		}
		case 'number': {
			return Number.parseFloat(value).toString() === value;
		}
	}
	// For skipping checking
	return true;
}
