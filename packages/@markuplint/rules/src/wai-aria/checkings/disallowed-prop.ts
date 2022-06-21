import type { Options } from '../types';
import type { AttrChecker } from '@markuplint/ml-core';
import type { ARIAProperty, ARIARole } from '@markuplint/ml-spec';

export const checkingDisallowedProp: AttrChecker<
	boolean,
	Options,
	{ role: ARIARole | null; propSpecs: ARIAProperty[] }
> =
	({ attr, role, propSpecs }) =>
	t => {
		if (!role) {
			return;
		}
		if (!/^aria-/i.test(attr.name)) {
			return;
		}
		const statesAndProp = role.ownedProperties.find(p => p.name === attr.name);
		if (statesAndProp) {
			return;
		}
		const propSpec = propSpecs.find(p => p.name === attr.name);
		return {
			scope: attr,
			message: t(
				'{0:c} on {1}',
				t('{0} is {1:c}', t('the "{0*}" {1}', attr.name, `ARIA ${propSpec?.type ?? 'property'}`), 'disallowed'),
				t('the "{0*}" {1}', role.name, 'role'),
			),
		};
	};
