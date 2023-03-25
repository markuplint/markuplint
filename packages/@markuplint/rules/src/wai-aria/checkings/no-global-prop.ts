import type { Options } from '../types';
import type { AttrChecker } from '@markuplint/ml-core';
import type { ARIAProperty } from '@markuplint/ml-spec';

export const checkingNoGlobalProp: AttrChecker<boolean, Options, { propSpecs: readonly ARIAProperty[] }> =
	({ attr, propSpecs }) =>
	t => {
		const propSpec = propSpecs.find(prop => prop.name === attr.name);
		if (propSpec && !propSpec.isGlobal) {
			return {
				scope: attr,
				message: t(
					'{0} is not {1}',
					t('the "{0*}" {1}', attr.name, `ARIA ${propSpec.type ?? 'property'}`),
					`global ${propSpec.type ?? 'property'}`,
				),
			};
		}
	};
