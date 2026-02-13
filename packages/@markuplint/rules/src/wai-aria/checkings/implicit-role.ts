import type { Options } from '../types.js';
import type { AttrChecker } from '@markuplint/ml-core';

import { ARIA_RECOMMENDED_VERSION, getImplicitRoleName } from '@markuplint/ml-spec';

/**
 * Checks whether the explicit `role` attribute duplicates the element's implicit (native) role.
 *
 * HTML elements have implicit ARIA roles (e.g., `<nav>` has an implicit role of `navigation`).
 * Explicitly setting the same role is redundant and should be avoided.
 *
 * @param attr - The `role` attribute node to inspect.
 * @returns A violation if any token in the role attribute matches the element's implicit role.
 */
export const checkingImplicitRole: AttrChecker<boolean, Options> =
	({ attr }) =>
	t => {
		const tokens = attr.tokenList?.allTokens();
		if (!tokens) {
			return;
		}

		const ariaVersion =
			attr.rule.options?.version ??
			attr.ownerMLDocument.ruleCommonSettings?.ariaVersion ??
			ARIA_RECOMMENDED_VERSION;
		const implicitRole = getImplicitRoleName(attr.ownerElement, ariaVersion, attr.ownerMLDocument.specs);
		for (const token of tokens) {
			if (implicitRole === token.raw) {
				return {
					scope: token,
					message: t(
						'{0} is {1}',
						t('the "{0*}" {1}', token.raw, 'role'),
						t(
							'{0} of {1}',
							'the implicit role',
							t('the "{0*}" {1}', attr.ownerElement.localName, 'element'),
						),
					),
				};
			}
		}
	};
