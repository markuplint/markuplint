import type { Options } from '../types.js';
import type { ElementChecker } from '@markuplint/ml-core';

import {
	ARIA_RECOMMENDED_VERSION,
	getARIA,
	mayBeFocusable,
	type ARIAProperty,
	type ARIARole,
} from '@markuplint/ml-spec';

/**
 * Checks whether all required ARIA properties for the element's computed role are present.
 *
 * Each ARIA role may define required states and properties (e.g., `slider` requires
 * `aria-valuenow`). This checker verifies that explicitly-set roles have their required
 * properties. Implicit roles are skipped since the browser provides default semantics.
 * Alternative native HTML attributes that satisfy the requirement are also considered.
 *
 * If a property declares `requiredCondition: 'focusable'` (currently only `separator`'s
 * `aria-valuenow`), the requirement is gated by `mayBeFocusable`: a non-focusable
 * separator no longer reports a missing `aria-valuenow`.
 *
 * @param el - The element node to inspect for required properties.
 * @param role - The computed ARIA role (with an optional `isImplicit` flag).
 * @param propSpecs - The list of ARIA property specifications for type lookup.
 * @returns A violation if a required property is missing and no native alternative is present.
 */
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
		const requiredProps = role.ownedProperties.filter(s => {
			if (!s.required) return false;
			// `requiredCondition: 'focusable'` makes the property required only when the
			// element may be focusable (e.g. `separator`'s `aria-valuenow`).
			if (s.requiredCondition === 'focusable' && !mayBeFocusable(el, el.ownerMLDocument.specs)) {
				return false;
			}
			return true;
		});
		for (const { name: requiredProp } of requiredProps) {
			const has = el.attributes.some(attr => {
				const attrName = attr.name.toLowerCase();
				return attrName === requiredProp;
			});
			if (!has) {
				const propSpec = propSpecs.find(p => p.name === requiredProp);

				const ariaVersion =
					el.rule.options?.version ??
					el.ownerMLDocument.ruleCommonSettings?.ariaVersion ??
					ARIA_RECOMMENDED_VERSION;

				const elAriaSpec = getARIA(
					el.ownerMLDocument.specs,
					el.localName,
					el.namespaceURI,
					ariaVersion,
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
