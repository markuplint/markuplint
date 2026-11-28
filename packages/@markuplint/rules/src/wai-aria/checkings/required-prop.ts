import type { Options } from '../types.js';
import type { Element, ElementChecker } from '@markuplint/ml-core';

import { ARIA_RECOMMENDED_VERSION, getARIARequiredStates, type ARIAProperty, type ARIARole } from '@markuplint/ml-spec';

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
 * The ARIA states and properties that the role of an element requires of its author: the ones that
 * `getARIARequiredStates` of `@markuplint/ml-spec` resolves as `required` and not `satisfiedByElement` (an implicit
 * role, or a native attribute that gives the property in its place). The accessibility properties of ml-core read
 * the same resolution, so they agree with the rules.
 *
 * `require-aria-prop` reports one that the element lacks, and `no-invalid-aria-prop-value` reports an empty value of
 * one, as an empty value is the absent attribute.
 *
 * @param el - The element
 * @param role - The computed role of the element
 * @returns The names of the required states and properties
 */
export function requiredPropsOf(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<boolean, Options>,
	role: (ARIARole & { isImplicit?: boolean }) | null | undefined,
): readonly string[] {
	if (!role) {
		return [];
	}
	const ariaVersion =
		el.rule.options?.version ?? el.ownerMLDocument.ruleCommonSettings?.ariaVersion ?? ARIA_RECOMMENDED_VERSION;
	const states = getARIARequiredStates(el.ownerMLDocument.specs, el, role, ariaVersion);
	return [...states]
		.filter(([, { required, satisfiedByElement }]) => required && !satisfiedByElement)
		.map(([name]) => name);
}
