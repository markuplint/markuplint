import type { Options } from '../types';
import type { AttrChecker } from '@markuplint/ml-core';

import { getImplicitRole } from '@markuplint/ml-spec';

export const checkingImplicitRole: AttrChecker<boolean, Options> =
	({ attr }) =>
	t => {
		const implictRole = getImplicitRole(attr.ownerElement, attr.rule.option.version, attr.ownerMLDocument.specs);
		if (implictRole === attr.value) {
			return {
				scope: attr,
				message: t(
					'{0} is {1}',
					t('the "{0*}" {1}', attr.value, 'role'),
					t('{0} of {1}', 'the implicit role', t('the "{0*}" {1}', attr.ownerElement.localName, 'element')),
				),
			};
		}
	};
