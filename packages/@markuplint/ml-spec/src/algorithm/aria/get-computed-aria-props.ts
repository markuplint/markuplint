import type { ARIAVersion, MLMLSpec } from '../../types/index.js';

import { ariaSpecs as _ariaSpecs } from './aria-specs.js';

import { getComputedRole } from './get-computed-role.js';
import { isValidAriaValue } from './is-valid-aria-value.js';
import { getImplicitValueOfRole } from './implicit-value.js';
import { getARIARequiredStates } from './required-state.js';

/**
 * A record mapping ARIA property names to their computed property details.
 */
type ARIAProps = Record<string, ARIAProp>;

/**
 * Represents a single computed ARIA property with its resolved value and metadata.
 */
type ARIAProp = {
	name: string;
	value: string | undefined;
	/** `ARIARequiredState.required`: the role's requirement, with its `requiredCondition` resolved against the element */
	required: boolean;
	/**
	 * Present, only together with `required: true`, when `ARIARequiredState.satisfiedByElement` is: the element itself
	 * satisfies the requirement
	 */
	satisfiedByElement?: true;
	deprecated: boolean;
	from: ARIAPropReferenceType;
};

/**
 * Indicates the source from which an ARIA property value was derived:
 * - `'default'`: The property's default value from the ARIA spec
 * - `'html-attr'`: A value mapped from an equivalent HTML attribute
 * - `'aria-attr'`: A value explicitly set via an `aria-*` attribute
 */
type ARIAPropReferenceType = 'default' | 'html-attr' | 'aria-attr';

/**
 * Computes the resolved ARIA properties for an element based on its computed role.
 * Resolves property values by checking explicit `aria-*` attributes first,
 * then equivalent HTML attributes, and finally falling back to spec-defined defaults.
 * `required` and `satisfiedByElement` come from `getARIARequiredStates`, the resolution
 * that the rules share.
 *
 * @param specs - The full markup language specification
 * @param el - The DOM element to compute ARIA properties for
 * @param version - The ARIA specification version to use
 * @returns A record of ARIA property names to their computed property details, or an empty record if the element has no computed role
 */
export function getComputedAriaProps(
	specs: MLMLSpec,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	version: ARIAVersion,
): ARIAProps {
	const ariaSpecs = _ariaSpecs(specs, version);

	const { role } = getComputedRole(specs, el, version);

	if (!role) {
		return {};
	}

	const props: ARIAProps = {};
	const requiredStates = getARIARequiredStates(specs, el, role, version);

	for (const ownedProp of role.ownedProperties) {
		const spec = ariaSpecs.props.find(propSpec => propSpec.name === ownedProp.name);
		if (!spec) {
			continue;
		}

		const required = requiredStates.get(ownedProp.name)?.required ?? false;
		const requiredState = requiredStates.get(ownedProp.name)?.satisfiedByElement
			? { required, satisfiedByElement: true as const }
			: { required };

		if (el.hasAttribute(spec.name)) {
			const attrValue = el.getAttribute(spec.name);
			// An empty value is the absent attribute (see `isValidAriaValue`)
			if (attrValue != null && attrValue !== '' && isValidAriaValue(spec, attrValue, role.name)) {
				props[ownedProp.name] = {
					name: ownedProp.name,
					value: attrValue,
					deprecated: !!spec.deprecated,
					...requiredState,
					from: 'aria-attr',
				};
				continue;
			}
		}

		// An entry with a `condition` (the editable state of `contenteditable`) is not read from the attribute, and the
		// editable state needs the ancestors of the element, which a DOM `Element` here does not give. The value that
		// it would give, `aria-readonly="false"`, is the default of the property.
		const equivalentHtmlAttr = spec.equivalentHtmlAttrs?.find(attr => !attr.condition);
		if (equivalentHtmlAttr && el.hasAttribute(equivalentHtmlAttr.htmlAttrName)) {
			const value =
				equivalentHtmlAttr.value === null
					? el.getAttribute(equivalentHtmlAttr.htmlAttrName)
					: equivalentHtmlAttr.value;
			if (value != null) {
				props[ownedProp.name] = {
					name: ownedProp.name,
					value,
					deprecated: !!spec.deprecated,
					...requiredState,
					from: 'html-attr',
				};
				continue;
			}
		}

		// The implicit value of the role takes the place of the default of the property (the rank of a heading element
		// for its role `heading`)
		const defaultValue = getImplicitValueOfRole(el, role.name, spec.name, version) ?? spec.defaultValue;

		props[ownedProp.name] = {
			name: ownedProp.name,
			value: defaultValue,
			deprecated: !!spec.deprecated,
			...requiredState,
			from: 'default',
		};
	}

	return props;
}
