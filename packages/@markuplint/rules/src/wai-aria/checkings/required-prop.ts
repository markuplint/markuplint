import type { Options } from '../types.js';
import type { Element, ElementChecker } from '@markuplint/ml-core';

import {
	ARIA_RECOMMENDED_VERSION,
	getARIA,
	mayBeFocusable,
	type ARIAProperty,
	type ARIARole,
} from '@markuplint/ml-spec';

/**
 * Checks whether the element has every ARIA state and property that it requires (`requiredPropsOf`).
 *
 * @param el - The element node to inspect for required properties.
 * @param role - The computed ARIA role (with an optional `isImplicit` flag).
 * @param propSpecs - The list of ARIA property specifications for type lookup.
 * @returns A violation if a required property is missing.
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
		for (const requiredProp of requiredPropsOf(el, role)) {
			// An attribute that the framework does not output (`aria-checked={null}`) is not there
			const has = el.attributes.some(attr => !attr.isAbsent && attr.nameKey === requiredProp);
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

/**
 * The ARIA states and properties that the role of an element requires of it: the required ones of an explicit role
 * (an implicit role is satisfied by the element itself, see the quote below), less one whose
 * `requiredCondition: 'focusable'` the element does not meet (`separator`'s `aria-valuenow`), and less one that a
 * native attribute of the element gives in its place (`properties.without[].alt` of the element's ARIA spec).
 *
 * `require-aria-prop` reports one that the element lacks, and `no-invalid-aria-prop-value` reports an empty value of
 * one, as an empty value is the absent attribute.
 *
 * > Features with implicit WAI-ARIA semantics satisfy WAI-ARIA structural requirements such as Required Accessibility Parent Roles, Allowed Accessibility Child Roles, required states and properties, etc. and do not require explicit WAI-ARIA semantics to be provided.
 *
 * @see https://w3c.github.io/aria/#implicit_semantics
 * @param el - The element
 * @param role - The computed role of the element
 * @returns The names of the required states and properties
 */
export function requiredPropsOf(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<boolean, Options>,
	role: (ARIARole & { isImplicit?: boolean }) | null | undefined,
): readonly string[] {
	if (!role || role.isImplicit) {
		return [];
	}
	const required = role.ownedProperties.filter(s => {
		if (!s.required) return false;
		// `requiredCondition: 'focusable'` makes the property required only when the
		// element may be focusable (e.g. `separator`'s `aria-valuenow`).
		if (s.requiredCondition === 'focusable' && !mayBeFocusable(el, el.ownerMLDocument.specs)) {
			return false;
		}
		return true;
	});
	if (required.length === 0) {
		return [];
	}
	const ariaVersion =
		el.rule.options?.version ?? el.ownerMLDocument.ruleCommonSettings?.ariaVersion ?? ARIA_RECOMMENDED_VERSION;
	const elAriaSpec = getARIA(
		el.ownerMLDocument.specs,
		el.localName,
		el.namespaceURI,
		ariaVersion,
		el.matches.bind(el),
	);
	return required
		.filter(({ name }) => {
			const alt =
				elAriaSpec?.properties === false
					? null
					: (elAriaSpec?.properties?.without?.find(p => p.name === name)?.alt ?? null);
			return !(alt?.method === 'set-attr' && el.hasAttribute(alt.target));
		})
		.map(({ name }) => name);
}
