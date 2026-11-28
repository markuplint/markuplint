import type { ARIARoleOwnedProperties, ARIAVersion, MLMLSpec } from '../../types/index.js';

import { mayBeFocusable } from '../html/may-be-focusable.js';

import { getARIA } from './get-aria.js';

/**
 * How a state or property that the role of an element owns is required of the element.
 */
export type ARIARequiredState = {
	/**
	 * Whether the role requires it of this element: `required` of the role, with its `requiredCondition` resolved
	 * against the element (`separator`'s `aria-valuenow` only when the element may be focusable).
	 */
	readonly required: boolean;
	/**
	 * Whether the element itself satisfies the requirement, so that the author need not write it. Always `false`
	 * when `required` is `false`. The element satisfies it in two ways:
	 *
	 * - The role is the implicit role of the element (the quote below).
	 * - A native attribute of the element gives it in its place: `properties.without[].alt` with `method: 'set-attr'`
	 *   of the element's ARIA spec, which records what ARIA in HTML says of the element (the `checked` attribute of
	 *   `input[type=checkbox]` in place of `aria-checked` under the role `switch`; the sources of `@markuplint/html-spec`
	 *   cite the passage at each entry).
	 *
	 * > Features with implicit WAI-ARIA semantics satisfy WAI-ARIA structural requirements such as Required Accessibility Parent Roles, Allowed Accessibility Child Roles, required states and properties, etc. and do not require explicit WAI-ARIA semantics to be provided.
	 *
	 * @see https://w3c.github.io/aria/#implicit_semantics
	 */
	readonly satisfiedByElement: boolean;
};

/**
 * Resolves how each state and property that the role of an element owns is required of the element. This is the
 * one resolution that the accessibility properties (`getComputedAriaProps`) and the rules of `@markuplint/rules`
 * (`require-aria-prop`, `no-invalid-aria-prop-value`) share: a property is reported missing when it is `required`
 * and not `satisfiedByElement`.
 *
 * Whether the element may be focusable and the ARIA spec of the element are looked up once per element, and only
 * when a property needs them.
 *
 * @param specs - The full markup language specification
 * @param el - The element
 * @param role - The computed role of the element (`isImplicit` when it is the element's implicit role)
 * @param version - The ARIA specification version to use
 * @returns The required state of each owned property, by its name
 */
export function getARIARequiredStates(
	specs: MLMLSpec,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	role: { readonly ownedProperties: readonly ARIARoleOwnedProperties[]; readonly isImplicit?: boolean },
	version: ARIAVersion,
): ReadonlyMap<string, ARIARequiredState> {
	let focusable: boolean | undefined;
	// `null` is a result (an element with no ARIA spec), so `undefined` alone marks "not looked up"
	let elAriaSpec: ReturnType<typeof getARIA> | undefined;

	const states = new Map<string, ARIARequiredState>();
	for (const ownedProp of role.ownedProperties) {
		const required =
			!!ownedProp.required &&
			(ownedProp.requiredCondition !== 'focusable' || (focusable ??= mayBeFocusable(el, specs)));
		if (!required || role.isImplicit) {
			states.set(ownedProp.name, { required, satisfiedByElement: required });
			continue;
		}
		if (elAriaSpec === undefined) {
			elAriaSpec = getARIA(specs, el.localName, el.namespaceURI, version, el.matches.bind(el));
		}
		const alt =
			elAriaSpec?.properties === false
				? null
				: (elAriaSpec?.properties?.without?.find(p => p.name === ownedProp.name)?.alt ?? null);
		states.set(ownedProp.name, {
			required,
			satisfiedByElement: alt?.method === 'set-attr' && el.hasAttribute(alt.target),
		});
	}
	return states;
}
