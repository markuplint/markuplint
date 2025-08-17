import type { ARIAAttributeValue, ARIAProperty, ARIAVersion, MLMLSpec } from '../../types/index.js';

import { ariaSpecs as _ariaSpecs } from './aria-specs.js';

import { getComputedRole } from './get-computed-role.js';

type ARIAProps = Record<string, ARIAProp>;

type ARIAProp = {
	name: string;
	value: string | undefined;
	required: boolean;
	deprecated: boolean;
	from: ARIAPropReferenceType;
};

type ARIAPropReferenceType = 'default' | 'html-attr' | 'aria-attr';

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

	for (const ownedProp of role.ownedProperties) {
		const spec = ariaSpecs.props.find(propSpec => propSpec.name === ownedProp.name);
		if (!spec) {
			continue;
		}

		if (el.hasAttribute(spec.name)) {
			const attrValue = el.getAttribute(spec.name);
			if (attrValue && isValidAriaValue(spec, role.name, attrValue, spec.enum)) {
				props[ownedProp.name] = {
					name: ownedProp.name,
					value: attrValue,
					deprecated: !!spec.deprecated,
					required: !!ownedProp.required,
					from: 'aria-attr',
				};
				continue;
			}
		}

		const equivalentHtmlAttr = spec.equivalentHtmlAttrs?.[0];
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
					required: !!ownedProp.required,
					from: 'html-attr',
				};
				continue;
			}
		}

		let defaultValue = spec.defaultValue;

		/**
		 * @see https://www.w3.org/TR/html-aria/#el-h1-h6
		 */
		if (ownedProp.name === 'aria-level' && /^H[1-6]$/.test(el.nodeName)) {
			defaultValue = el.nodeName.replace('H', '');
		}

		props[ownedProp.name] = {
			name: ownedProp.name,
			value: defaultValue,
			deprecated: !!spec.deprecated,
			required: !!ownedProp.required,
			from: 'default',
		};
	}

	return props;
}

function isValidAriaValue(spec: ARIAProperty, role: string, value: string | undefined, enumList: readonly string[]) {
	let type: ARIAAttributeValue = spec.value;
	if (spec.conditionalValue) {
		for (const cond of spec.conditionalValue) {
			if (cond.role.includes(role)) {
				type = cond.value;
			}
		}
	}

	value = (value ?? '').trim();
	switch (type) {
		case 'string': {
			return true;
		}
		case 'ID reference':
		case 'ID reference list':
		case 'URI': {
			return !!value;
		}
		case 'integer':
		case 'number': {
			return !Number.isNaN(Number.parseFloat(value));
		}
		case 'token':
		case 'token list': {
			if (enumList.length === 0) {
				throw new Error('Need an enum list in token and token list types');
			}
			return enumList.includes(value.toLowerCase());
		}
		case 'tristate': {
			return ['true', 'false', 'mixed'].includes(value.toLowerCase());
		}
		case 'true/false': {
			return ['true', 'false'].includes(value.toLowerCase());
		}
		case 'true/false/undefined': {
			return ['true', 'false', 'undefined'].includes(value.toLowerCase());
		}
	}
}
