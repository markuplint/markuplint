import type { AttributeType } from '@markuplint/ml-spec';
import type { Pattern } from '@markuplint/types';

import { createRule, getAttrSpecs, getSpec } from '@markuplint/ml-core';

import { resolveAttrEligibility, suggestionSuffix } from '../attr-eligibility.js';

import meta from './meta.js';

/**
 * Configuration options for the `no-unknown-attr` rule.
 */
type Option = {
	/**
	 * Attribute names to treat as known, beyond what the spec defines.
	 * The value type is used by `no-invalid-attr-value` to validate the
	 * attribute's value; here it only determines whether the name is known.
	 *
	 * @since 3.7.0
	 */
	allowAttrs?: (string | Attr)[] | Record<string, AttributeType | Pattern>;

	/** Attribute name prefix(es) to ignore during validation. */
	ignoreAttrNamePrefix?: string | string[];

	/** Whether to allow additional properties for pretender elements (defaults to `true`). */
	allowToAddPropertiesForPretender?: boolean;
};

/**
 * Describes a single attribute with its name and expected value constraint.
 */
type Attr = {
	/** The attribute name. */
	name: string;
	/** The expected attribute value type or validation rule. */
	value: AttributeType | Pattern;
};

function allowedNames(allowAttrs: Option['allowAttrs']): Set<string> {
	if (!allowAttrs) {
		return new Set();
	}
	if (Array.isArray(allowAttrs)) {
		return new Set(allowAttrs.map(a => (typeof a === 'string' ? a : a.name)));
	}
	return new Set(Object.keys(allowAttrs));
}

export default createRule<boolean, Option>({
	meta: meta,
	defaultOptions: {},
	async verify({ document, report, t }) {
		await document.walkOn('Attr', attr => {
			if (attr.isDirective) {
				return;
			}

			const allowToAddPropertiesForPretender = attr.rule.options.allowToAddPropertiesForPretender ?? true;
			const name = attr.name;
			const attrName = attr.nameNode;

			// A parser-supplied IDL naming suggestion (e.g. `tabindex` -> `tabIndex`
			// in JSX) takes priority over spec-driven typo detection below.
			if (attr.ownerElement.elementType === 'html' && attr.candidate) {
				report({
					scope: attr,
					line: attrName?.startLine,
					col: attrName?.startCol,
					raw: attrName?.raw,
					message:
						t('{0} is {1:c}', t('the "{0*}" {1}', name, 'attribute'), 'disallowed') +
						t('. ') +
						t('Did you mean "{0}"?', attr.candidate),
				});
				return;
			}

			if (attr.rule.options.ignoreAttrNamePrefix != null) {
				const prefixes = Array.isArray(attr.rule.options.ignoreAttrNamePrefix)
					? attr.rule.options.ignoreAttrNamePrefix
					: [attr.rule.options.ignoreAttrNamePrefix];
				if (prefixes.some(prefix => name.indexOf(prefix) === 0)) {
					return;
				}
			}

			if (allowedNames(attr.rule.options.allowAttrs).has(name)) {
				return;
			}

			if (attr.ownerElement.elementType !== 'html') {
				return;
			}

			const attrSpecs = getAttrSpecs(attr.ownerElement, document.specs);
			if (!attrSpecs) {
				return;
			}

			const eligibility = resolveAttrEligibility(name, attr.ownerElement, attrSpecs);

			let message: string | undefined;
			switch (eligibility.status) {
				case 'unknown': {
					message =
						t('{0} is {1:c}', t('the "{0*}" {1}', name, 'attribute'), 'disallowed') +
						suggestionSuffix(t, eligibility.candidate);
					break;
				}
				case 'case-mismatch': {
					message =
						t('{0} is {1:c}', t('the "{0*}" {1}', name, 'attribute'), 'disallowed') +
						suggestionSuffix(t, eligibility.expectedName);
					break;
				}
				default: {
					return;
				}
			}

			if (allowToAddPropertiesForPretender && attr.ownerElement.pretenderContext?.type === 'origin') {
				return;
			}

			const spec = getSpec(attr.ownerElement, document.specs.specs);
			if (spec?.possibleToAddProperties) {
				return;
			}

			report({
				scope: attr,
				message,
				line: attrName?.startLine,
				col: attrName?.startCol,
				raw: attrName?.raw,
			});
		});
	},
});
