import type { Options } from '../types';
import type { AttrChecker } from '@markuplint/ml-core';

import { getPermittedRoles } from '@markuplint/ml-spec';

export const checkingPermittedRoles: AttrChecker<boolean, Options> =
	({ attr }) =>
	t => {
		const el = attr.ownerElement;
		const permittedRoles = getPermittedRoles(el, el.rule.option.version, attr.ownerMLDocument.specs);
		if (permittedRoles === false) {
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
		} else if (Array.isArray(permittedRoles) && !permittedRoles.includes(attr.value)) {
			return {
				scope: attr,
				message: t(
					'{0} according to {1}',
					t(
						'Cannot overwrite {0} to {1}',
						t('the "{0*}" {1}', attr.value, 'role'),
						t('the "{0*}" {1}', el.localName, 'element'),
					),
					'ARIA in HTML specification',
				),
			};
		}
	};
