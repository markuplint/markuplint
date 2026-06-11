import type { Options } from '../types.js';
import type { ElementChecker } from '@markuplint/ml-core';
import type { ComputedRole } from '@markuplint/ml-spec';

import { ARIA_RECOMMENDED_VERSION, ariaSpecs } from '@markuplint/ml-spec';

/**
 * Checks whether an element with an explicit role satisfies its
 * "Required Accessibility Parent Role" (called "Required Context Role" in ARIA 1.2).
 *
 * When `getComputedRole()` detects that the parent hierarchy does not include
 * one of the required context roles, it sets `errorType` to
 * `'INVALID_REQUIRED_CONTEXT_ROLE'` (mismatch) or `'NO_OWNER'`
 * (no non-transparent ancestor found) and resets `role` to `null`.
 * This checker translates either result into a user-facing violation.
 *
 * Only explicit roles (set via the `role` attribute) are checked;
 * implicit roles are skipped because native HTML parent-child semantics
 * are already guaranteed by the HTML specification.
 *
 * @see https://w3c.github.io/aria/#scope
 * @param el - The element to inspect.
 * @param computed - The computed role result from `getComputedRole()`.
 * @returns A violation if the role's required context is not satisfied.
 */
export const checkingRequiredAccessibilityParentRole: ElementChecker<
	boolean,
	Options,
	{
		computed?: ComputedRole;
	}
> =
	({ el, computed }) =>
	t => {
		if (
			!computed ||
			(computed.errorType !== 'INVALID_REQUIRED_CONTEXT_ROLE' &&
				// NO_OWNER with role: null means all ancestors were transparent
				// and no valid context could be found. NO_OWNER with role kept
				// (parentElement === null) is a root fragment — skip.
				!(computed.errorType === 'NO_OWNER' && !computed.role))
		) {
			return;
		}

		const roleAttr = el.getAttributeNode('role');
		if (!roleAttr) {
			return;
		}

		const ariaVersion =
			el.rule.options?.version ?? el.ownerMLDocument.ruleCommonSettings?.ariaVersion ?? ARIA_RECOMMENDED_VERSION;
		const { roles } = ariaSpecs(el.ownerMLDocument.specs, ariaVersion);

		for (const token of roleAttr.tokenList?.allTokens() ?? []) {
			const roleSpec = roles.find(r => r.name === token.raw);
			if (!roleSpec) {
				continue;
			}
			// `ariaSpecs().roles` returns raw spec data where the field is always
			// `requiredContextRole` for all versions. The fallback to
			// `requiredAccessibilityParentRole` is a defensive guard in case
			// the generator changes the field name in the future.
			const parentRoles = roleSpec.requiredContextRole ?? roleSpec.requiredAccessibilityParentRole;
			if (parentRoles && parentRoles.length > 0) {
				return {
					scope: token,
					message: t(
						'{0} requires {1}',
						t('the "{0*}" {1}', roleSpec.name, 'role'),
						parentRoles.length === 1 && parentRoles[0]
							? t('an accessibility parent with the "{0*}" {1}', parentRoles[0], 'role')
							: t('an accessibility parent with one of the {0}', 'roles') +
									`: ${t(parentRoles as string[])}`,
					),
				};
			}
		}
	};
