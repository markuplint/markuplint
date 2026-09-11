import type { Options } from '../types.js';
import type { AttrChecker } from '@markuplint/ml-core';

import { ARIA_RECOMMENDED_VERSION, getPermittedRoles } from '@markuplint/ml-spec';

/**
 * Checks whether the explicit `role` attribute value is permitted on the element
 * according to the ARIA in HTML specification.
 *
 * Each HTML element defines a set of roles that may be assigned to it. Some elements
 * (e.g., `<meta>`) do not allow any role overrides. This checker enforces those constraints.
 *
 * @param attr - The `role` attribute node to inspect.
 * @returns A violation if the role is not in the element's list of permitted roles.
 */
export const checkingPermittedRoles: AttrChecker<boolean, Options> =
	({ attr }) =>
	t => {
		const ariaVersion =
			attr.rule.options?.version ??
			attr.ownerMLDocument.ruleCommonSettings?.ariaVersion ??
			ARIA_RECOMMENDED_VERSION;
		const el = attr.ownerElement;
		const permittedRoles = getPermittedRoles(el, ariaVersion, attr.ownerMLDocument.specs);
		const tokens = attr.tokenList?.allTokens();
		// When no explicit role is permitted on this element, report against each token
		// so the offending role name is preserved in the message (same scope as the
		// per-token branch below). If there are no tokens, fall back to the whole attr.
		if (permittedRoles.length === 0) {
			if (!tokens || tokens.length === 0) {
				return {
					scope: attr,
					message: t(
						'{0} according to {1}',
						t(
							'Cannot overwrite {0}',
							t('{0} of {1}', t('the {0}', 'role'), t('the "{0*}" {1}', el.localName, 'element')),
						),
						'ARIA in HTML specification',
					),
				};
			}
			const firstToken = tokens[0];
			if (!firstToken) {
				return;
			}
			return {
				scope: firstToken,
				message: t(
					'{0} according to {1}',
					t(
						'Cannot overwrite {0} to {1}',
						t('the "{0*}" {1}', firstToken.raw, 'role'),
						t('the "{0*}" {1}', el.localName, 'element'),
					),
					'ARIA in HTML specification',
				),
			};
		}
		if (!tokens) {
			return;
		}
		for (const token of tokens) {
			if (Array.isArray(permittedRoles) && !permittedRoles.map(r => r.name).includes(token.raw)) {
				return {
					scope: token,
					message: t(
						'{0} according to {1}',
						t(
							'Cannot overwrite {0} to {1}',
							t('the "{0*}" {1}', token.raw, 'role'),
							t('the "{0*}" {1}', el.localName, 'element'),
						),
						'ARIA in HTML specification',
					),
				};
			}
		}
	};
