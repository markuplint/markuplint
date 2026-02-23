import type { Options } from '../types.js';
import type { AttrChecker } from '@markuplint/ml-core';

import { ARIA_RECOMMENDED_VERSION, ariaSpecs } from '@markuplint/ml-spec';

/**
 * Checks whether the `role` attribute value refers to a role that does not exist
 * in the WAI-ARIA specification.
 *
 * Validates each token in the role attribute against the known ARIA roles list.
 * For SVG elements, the WAI-ARIA Graphics Module roles are also accepted.
 * DPub ARIA roles (Digital Publishing WAI-ARIA Module) are accepted for all elements.
 *
 * @param attr - The `role` attribute node to inspect.
 * @returns A violation if any token does not correspond to a defined ARIA role.
 */
export const checkingNonExistentRole: AttrChecker<boolean, Options> =
	({ attr }) =>
	t => {
		const ariaVersion =
			attr.rule.options?.version ??
			attr.ownerMLDocument.ruleCommonSettings?.ariaVersion ??
			ARIA_RECOMMENDED_VERSION;
		const { roles, graphicsRoles, dpubRoles } = ariaSpecs(attr.ownerMLDocument.specs, ariaVersion);
		const tokens = attr.tokenList?.allTokens();
		if (!tokens) {
			return;
		}
		for (const token of tokens) {
			let role = roles.find(r => r.name === token.raw);
			if (!role && attr.ownerElement.namespaceURI === 'http://www.w3.org/2000/svg') {
				role = graphicsRoles.find(r => r.name === token.raw);
			}
			if (!role) {
				role = dpubRoles.find(r => r.name === token.raw);
			}
			if (!role) {
				return {
					scope: token,
					message:
						t(
							'{0} according to {1}',
							t('{0} does not exist', t('the "{0*}" {1}', token.raw, 'role')),
							'the WAI-ARIA specification',
						) + t('.'),
				};
			}
		}
	};
