import type { Options } from '../types.js';
import type { AttrChecker } from '@markuplint/ml-core';
import type { ARIAProperty, ARIAVersion, Attribute } from '@markuplint/ml-spec';

import { getImplicitValueOfRole, hasImplicitValueOfSomeRole, isValueOfNativeState } from '@markuplint/ml-spec';

import { asciiLowerCase, isValidFloatingPointNumber, trimAsciiWhitespace } from '@markuplint/shared';

import { resolveAttrEligibility } from '../../attr-eligibility.js';

/**
 * Checks whether an ARIA property is explicitly set to the value that the element has without it: the implicit value
 * of its role where the role gives one (`aria-live` of `alert` is `assertive`), else the default of the property.
 *
 * Setting an ARIA property to that value is redundant and may indicate a misunderstanding of the property's behavior.
 * A keyword is compared as browsers read it, and a number as a number (`aria-valuemin="0.0"` is the 0 of a slider).
 *
 * @param attr - The ARIA attribute node to inspect.
 * @param attrSpecs - The attribute specifications of the element, which say whether a native equivalent applies to it
 * @param propSpecs - The list of ARIA property specifications for value lookup.
 * @param role - The name of the computed role of the element, or null when it has none
 * @param roleUnknown - Whether the role is not known until it is rendered, which leaves the implicit value not known
 * @param version - The ARIA version
 * @returns A violation if the attribute value matches the value the element has without it.
 */
export const checkingDefaultValue: AttrChecker<
	boolean,
	Options,
	{
		attrSpecs: readonly Attribute[] | null;
		propSpecs: readonly ARIAProperty[];
		role: string | null;
		roleUnknown: boolean;
		version: ARIAVersion;
	}
> =
	({ attr, attrSpecs, propSpecs, role, roleUnknown, version }) =>
	t => {
		if (attr.isDynamicValue) {
			return;
		}
		// A role that is not known gives an implicit value that is not known, to a property that some role gives one
		if (roleUnknown && hasImplicitValueOfSomeRole(attr.nameKey, version)) {
			return;
		}
		const propSpec = propSpecs.find(p => p.name === attr.nameKey);
		// What the element has without the attribute is the value of its native equivalent when it has one that applies
		// to the element, which `no-redundant-aria-prop` compares
		if (
			propSpec?.equivalentHtmlAttrs?.some(eq => {
				if (!attr.ownerElement.hasAttribute(eq.htmlAttrName)) {
					return false;
				}
				const { status } = resolveAttrEligibility(eq.htmlAttrName, attr.ownerElement, attrSpecs ?? []);
				return status !== 'unknown' && status !== 'condition-not-met';
			})
		) {
			return;
		}
		// The value of an `input` and the selectedness of an `option` are their own state, which the markup does not
		// tell in full
		if (isValueOfNativeState(attr.ownerElement, attr.nameKey)) {
			return;
		}
		const implicit = role === null ? null : getImplicitValueOfRole(attr.ownerElement, role, attr.nameKey, version);
		const defaultValue = implicit ?? propSpec?.defaultValue;
		if (defaultValue != null && isSameValue(attr.value, defaultValue)) {
			return {
				scope: attr,
				message: t('It is {0}', 'default value'),
			};
		}
	};

/**
 * @param value - The value of the attribute
 * @param defaultValue - The default value
 * @returns Whether they are one value: a keyword as browsers read it (ASCII case-insensitively, not trimmed, see
 *   `isAriaTrue` of `@markuplint/ml-spec`), a number as a number (the whole value with ASCII white space trimmed)
 */
function isSameValue(value: string, defaultValue: string): boolean {
	if (isValidFloatingPointNumber(defaultValue)) {
		const trimmed = trimAsciiWhitespace(value);
		return isValidFloatingPointNumber(trimmed) && Number(trimmed) === Number(defaultValue);
	}
	return asciiLowerCase(value) === defaultValue;
}
