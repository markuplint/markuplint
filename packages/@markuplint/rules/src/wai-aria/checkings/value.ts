import type { Options } from '../types';
import type { AttrChecker } from '@markuplint/ml-core';
import type { ARIAProperty, ARIARole } from '@markuplint/ml-spec';

import { checkAria } from '../../helpers';

export const checkingValue: AttrChecker<
	boolean,
	Options,
	{
		role?: ARIARole | null;
		propSpecs: ARIAProperty[];
	}
> =
	({ attr, role, propSpecs }) =>
	t => {
		if (attr.isDynamicValue) {
			return;
		}
		const propSpec = propSpecs.find(p => p.name === attr.name);
		const result = checkAria(
			attr.ownerMLDocument.specs,
			attr.name,
			attr.value,
			attr.rule.option.version,
			role?.name,
		);
		if (result.isValid) {
			return;
		}
		return {
			scope: attr,
			message:
				t(
					'{0:c} on {1}',
					t('{0} is {1:c}', t('the "{0}"', attr.value), 'disallowed'),
					t('the "{0*}" {1}', attr.name, `ARIA ${propSpec?.type ?? 'property'}`),
				) +
				('enum' in result && result.enum.length ? t('. ') + t('Allowed values are: {0}', t(result.enum)) : ''),
		};
	};
