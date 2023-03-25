import type { Options } from '../types';
import type { AttrChecker } from '@markuplint/ml-core';
import type { ARIAProperty } from '@markuplint/ml-spec';

export const checkingDefaultValue: AttrChecker<boolean, Options, { propSpecs: readonly ARIAProperty[] }> =
	({ attr, propSpecs }) =>
	t => {
		if (attr.isDynamicValue) {
			return;
		}
		const propSpec = propSpecs.find(p => p.name === attr.name);
		const value = attr.value.trim().toLowerCase();
		if (propSpec?.defaultValue != null && propSpec.defaultValue === value) {
			return {
				scope: attr,
				message: t('It is {0}', 'default value'),
			};
		}
	};
