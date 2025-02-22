import type { Options } from '../types.js';
import type { ElementChecker } from '@markuplint/ml-core';

import { getARIA, type ARIAProperty, type ARIARole } from '@markuplint/ml-spec';

export const checkingRequiredProp: ElementChecker<
	boolean,
	Options,
	{ role?: (ARIARole & { isImplicit?: boolean }) | null; propSpecs: readonly ARIAProperty[] }
> =
	({ el, role, propSpecs }) =>
	t => {
		if (!role) {
			return;
		}
		if (role.isImplicit) {
			return;
		}
		const requiredProps = role.ownedProperties.filter(s => !!s.required).map(s => s.name);
		for (const requiredProp of requiredProps) {
			const has = el.attributes.some(attr => {
				const attrName = attr.name.toLowerCase();
				return attrName === requiredProp;
			});
			if (!has) {
				const propSpec = propSpecs.find(p => p.name === requiredProp);

				const elAriaSpec = getARIA(
					el.ownerMLDocument.specs,
					el.localName,
					el.namespaceURI,
					el.rule.options.version,
					el.matches.bind(el),
				);

				const alt =
					elAriaSpec?.properties === false
						? null
						: (elAriaSpec?.properties?.without?.find(p => p.name === requiredProp)?.alt ?? null);

				if (alt?.method === 'set-attr' && el.hasAttribute(alt.target)) {
					return;
				}

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
