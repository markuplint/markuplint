import type { Options } from '../types.js';
import type { AttrChecker } from '@markuplint/ml-core';
import type { ARIARole } from '@markuplint/ml-spec';

export const checkingDeprecatedRole: AttrChecker<boolean, Options, { role: ARIARole | null }> =
	({ attr, role }) =>
	t => {
		if (!role) {
			return;
		}
		if (role.deprecated) {
			return {
				scope: attr,
				message: t('{0} is {1:c}', t('the "{0*}" {1}', attr.value, 'role'), 'deprecated'),
			};
		}
	};
