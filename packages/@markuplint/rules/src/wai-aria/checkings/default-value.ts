import type { Options } from '../types.js';
import type { AttrChecker } from '@markuplint/ml-core';
import type { ARIAProperty } from '@markuplint/ml-spec';

import { getImplicitValueOfRole } from '@markuplint/ml-spec';

import { asciiLowerCase } from '@markuplint/shared';

/**
 * Checks whether an ARIA property is explicitly set to its spec-defined default value.
 *
 * Setting an ARIA property to its default value is redundant and may indicate
 * a misunderstanding of the property's behavior. This checker reports such cases
 * when the `disallowDefaultValue` option is enabled.
 *
 * @param attr - The ARIA attribute node to inspect.
 * @param propSpecs - The list of ARIA property specifications for value lookup.
 * @returns A violation if the attribute value matches the property's default value.
 */
export const checkingDefaultValue: AttrChecker<
	boolean,
	Options,
	{ propSpecs: readonly ARIAProperty[]; role: string | null }
> =
	({ attr, propSpecs, role }) =>
	t => {
		if (attr.isDynamicValue) {
			return;
		}
		const propSpec = propSpecs.find(p => p.name === attr.nameKey);
		// The value the element has without the attribute: the implicit value of its role, else the default of the
		// property
		const implicit = role === null ? null : getImplicitValueOfRole(role, attr.nameKey);
		const defaultValue = implicit ?? propSpec?.defaultValue;
		// A keyword as browsers read it: ASCII case-insensitively, not trimmed (`isAriaTrue` of `@markuplint/ml-spec`)
		const value = asciiLowerCase(attr.value);
		if (defaultValue != null && defaultValue === value) {
			return {
				scope: attr,
				message: t('It is {0}', 'default value'),
			};
		}
	};
