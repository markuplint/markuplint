import type { Options } from '../types.js';
import type { AttrChecker } from '@markuplint/ml-core';

import { getPermittedRoles } from '@markuplint/ml-spec';

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
		const el = attr.ownerElement;
		const permittedRoles = getPermittedRoles(el, el.rule.options.version, attr.ownerMLDocument.specs);
		if (permittedRoles.length === 0) {
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
		const tokens = attr.tokenList?.allTokens();
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
