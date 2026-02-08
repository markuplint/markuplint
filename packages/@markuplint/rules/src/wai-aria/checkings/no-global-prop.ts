import type { Options } from '../types.js';
import type { AttrChecker } from '@markuplint/ml-core';
import type { ARIAProperty } from '@markuplint/ml-spec';

/**
 * Checks whether a non-global ARIA property is used on an element without an explicit role.
 *
 * When no role is computed for an element, only global ARIA properties (e.g., `aria-label`,
 * `aria-hidden`) are allowed. This checker reports non-global properties used in that context.
 *
 * @param attr - The ARIA attribute node to inspect.
 * @param propSpecs - The list of ARIA property specifications for global status lookup.
 * @returns A violation if the property is not a global ARIA property.
 */
export const checkingNoGlobalProp: AttrChecker<boolean, Options, { propSpecs: readonly ARIAProperty[] }> =
	({ attr, propSpecs }) =>
	t => {
		const propSpec = propSpecs.find(prop => prop.name === attr.name);
		if (propSpec && !propSpec.isGlobal) {
			return {
				scope: attr,
				message: t(
					'{0} is not {1}',
					t('the "{0*}" {1}', attr.name, `ARIA ${propSpec.type ?? 'property'}`),
					`global ${propSpec.type ?? 'property'}`,
				),
			};
		}
	};
