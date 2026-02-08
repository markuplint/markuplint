import type { Options } from '../types.js';
import type { AttrChecker } from '@markuplint/ml-core';
import type { ARIARole } from '@markuplint/ml-spec';

/**
 * Checks whether the element's computed ARIA role is deprecated in the specified ARIA version.
 *
 * Deprecated roles should be avoided as they may be removed in future ARIA versions
 * and assistive technologies may not support them reliably.
 *
 * @param attr - The `role` attribute node to inspect.
 * @param role - The computed ARIA role of the element.
 * @returns A violation if the role is marked as deprecated.
 */
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
