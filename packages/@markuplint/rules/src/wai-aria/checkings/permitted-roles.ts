import type { Options } from '../types';
import type { AttrChecker } from '@markuplint/ml-core';

import { getPermittedRoles } from '@markuplint/ml-spec';

export const checkingPermittedRoles: AttrChecker<boolean, Options> =
	({ attr }) =>
	t => {
		const el = attr.ownerElement;
		const permittedRoles = getPermittedRoles(el, el.rule.option.version, attr.ownerMLDocument.specs);
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
