import type { Options } from '../types.js';
import type { AttrChecker } from '@markuplint/ml-core';
import type { ARIAProperty, ARIARole } from '@markuplint/ml-spec';

import { checkingElementSupportsAriaProp } from './element-supports-aria-prop.js';
import { checkingProhibitedNaming } from './prohibited-naming.js';
import { checkingRoleSupportsAriaProp } from './role-supports-aria-prop.js';

/**
 * Checks whether an ARIA property or state is disallowed on the element's computed role.
 *
 * Composes the three checks the `wai-aria-disallowed-props` rule (v5: split into
 * `no-prohibited-naming`, `element-supports-aria-prop`, and `role-supports-aria-prop`)
 * used to run together, in the same short-circuit order: naming prohibition first
 * (unconditional), then element-specific restrictions (gated on
 * `disallowSetImplicitProps`, this rule's own opt-out — the split rules instead let
 * users opt out by disabling `element-supports-aria-prop` directly), then the
 * role-derived check.
 *
 * @param attr - The ARIA attribute node to inspect.
 * @param role - The computed ARIA role of the element.
 * @param propSpecs - The list of ARIA property specifications for type lookup.
 * @param disallowSetImplicitProps - Whether to also enforce element-specific restrictions.
 * @returns A violation if the property is not allowed on the given role or element.
 */
export const checkingDisallowedProp: AttrChecker<
	boolean,
	Options,
	{
		role: ARIARole | null;
		propSpecs: readonly ARIAProperty[];
		disallowSetImplicitProps: boolean;
	}
> =
	({ attr, role, propSpecs, disallowSetImplicitProps }) =>
	t => {
		const namingResult = checkingProhibitedNaming({ attr, role, propSpecs })(t);
		if (namingResult) {
			return namingResult;
		}

		if (disallowSetImplicitProps) {
			const elementResult = checkingElementSupportsAriaProp({ attr, role, propSpecs })(t);
			if (elementResult) {
				return elementResult;
			}
		}

		return checkingRoleSupportsAriaProp({ attr, role, propSpecs })(t);
	};
