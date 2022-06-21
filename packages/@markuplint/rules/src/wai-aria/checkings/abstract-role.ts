import type { Options } from '../types';
import type { AttrChecker } from '@markuplint/ml-core';

import { ariaSpecs } from '@markuplint/ml-spec';

export const checkingAbstractRole: AttrChecker<boolean, Options> =
	({ attr }) =>
	t => {
		const { roles } = ariaSpecs(attr.ownerMLDocument.specs, attr.rule.option.version);
		const role = roles.find(r => r.name === attr.value);
		if (role?.isAbstract) {
			return {
				scope: attr,
				message: t('{0} is {1}', t('the "{0*}" {1}', attr.value, 'role'), 'the abstract role'),
			};
		}
	};
