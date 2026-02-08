import type { Options } from '../types.js';
import type { AttrChecker } from '@markuplint/ml-core';
import type { ARIAProperty } from '@markuplint/ml-spec';

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
export const checkingDefaultValue: AttrChecker<boolean, Options, { propSpecs: readonly ARIAProperty[] }> =
	({ attr, propSpecs }) =>
	t => {
		if (attr.isDynamicValue) {
			return;
		}
		const propSpec = propSpecs.find(p => p.name === attr.name);
		const value = attr.value.trim().toLowerCase();
		if (propSpec?.defaultValue != null && propSpec.defaultValue === value) {
			return {
				scope: attr,
				message: t('It is {0}', 'default value'),
			};
		}
	};
