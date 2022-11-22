import type { Options } from '../types';
import type { ElementChecker } from '@markuplint/ml-core';
import type { ARIAProperty, ARIARole } from '@markuplint/ml-spec';

export const checkingRequiredProp: ElementChecker<
	boolean,
	Options,
	{ role?: (ARIARole & { isImplicit?: boolean }) | null; propSpecs: ARIAProperty[] }
> =
	({ el, role, propSpecs }) =>
	t => {
		if (!role) {
			return;
		}
		if (role.isImplicit) {
			return;
		}
		const requiredProps = role.ownedProperties.filter(s => s.required).map(s => s.name);
		for (const requiredProp of requiredProps) {
			const has = el.attributes.some(attr => {
				const attrName = attr.name.toLowerCase();
				return attrName === requiredProp;
			});
			if (!has) {
				const propSpec = propSpecs.find(p => p.name === requiredProp);
				return {
					scope: el,
					message: t(
						'{0:c} on {1}',
						t('Require {0}', t('the "{0*}" {1}', requiredProp, `ARIA ${propSpec?.type ?? 'property'}`)),
						t('the "{0*}" {1}', role.name, 'role'),
					),
				};
			}
		}
	};
