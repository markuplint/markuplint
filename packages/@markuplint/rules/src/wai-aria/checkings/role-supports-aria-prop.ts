import type { Options } from '../types.js';
import type { AttrChecker } from '@markuplint/ml-core';
import type { ARIAProperty, ARIARole } from '@markuplint/ml-spec';

/**
 * Checks whether an ARIA property or state is supported by the element's
 * computed role, per the role's WAI-ARIA definition (`ownedProperties`).
 *
 * When the element has no computed role, there is nothing to check here —
 * a role-less element with `aria-*` restrictions is `element-supports-aria-prop`'s
 * concern instead.
 *
 * @param attr - The ARIA attribute node to inspect.
 * @param role - The computed ARIA role of the element.
 * @param propSpecs - The list of ARIA property specifications for type lookup.
 * @returns A violation if the property is not supported by the given role.
 */
export const checkingRoleSupportsAriaProp: AttrChecker<
	boolean,
	Options,
	{
		role: ARIARole | null;
		propSpecs: readonly ARIAProperty[];
	}
> =
	({ attr, role, propSpecs }) =>
	t => {
		if (!/^aria-/i.test(attr.name)) {
			return;
		}

		if (!role) {
			return;
		}

		const statesAndProp = role.ownedProperties.find(p => p.name === attr.name);
		if (statesAndProp) {
			return;
		}

		const propSpec = propSpecs.find(p => p.name === attr.name);
		return {
			scope: attr,
			message: t(
				'{0:c} on {1}',
				t('{0} is {1:c}', t('the "{0*}" {1}', attr.name, `ARIA ${propSpec?.type ?? 'property'}`), 'disallowed'),
				t('the "{0*}" {1}', role.name, 'role'),
			),
		};
	};
