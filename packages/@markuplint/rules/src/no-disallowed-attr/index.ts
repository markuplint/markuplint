import type { AttributeType } from '@markuplint/ml-spec';
import type { Pattern } from '@markuplint/types';

import { createRule, getAttrSpecs, getSpec } from '@markuplint/ml-core';

import { resolveAttrEligibility } from '../attr-eligibility.js';

import meta from './meta.js';

/**
 * Configuration options for the `no-disallowed-attr` rule.
 */
type Option = {
	/**
	 * Attribute names to treat as known and allowed, beyond what the spec
	 * defines. Shares its shape with `no-unknown-attr`'s option of the same
	 * name — see that rule for the full description.
	 *
	 * @since 3.7.0
	 */
	allowAttrs?: (string | Attr)[] | Record<string, AttributeType | Pattern>;

	/** Attribute name prefix(es) to ignore during validation. */
	ignoreAttrNamePrefix?: string | string[];
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

			const name = attr.name;
			const attrName = attr.nameNode;

			// https://html.spec.whatwg.org/multipage/custom-elements.html#attr-is
			// "The is attribute must not be specified on an autonomous custom element"
			if (name === 'is' && attr.ownerElement.elementType === 'web-component') {
				report({
					scope: attr,
					line: attrName?.startLine,
					col: attrName?.startCol,
					raw: attrName?.raw,
					message: t('The "{0}" attribute must not be specified on an autonomous custom element', 'is'),
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

			if (eligibility.status === 'no-use') {
				report({
					scope: attr,
					message: t('{0} is {1:c}', t('the "{0*}" {1}', name, 'attribute'), 'disallowed'),
				});
				return;
			}

			if (eligibility.status !== 'condition-not-met') {
				return;
			}

			const spec = getSpec(attr.ownerElement, document.specs.specs);
			if (spec?.possibleToAddProperties) {
				return;
			}

			report({
				scope: attr,
				message: t('{0} is {1}', t('the "{0*}" {1}', name, 'attribute'), 'disallowed'),
				line: attrName?.startLine,
				col: attrName?.startCol,
				raw: attrName?.raw,
			});
		});
	},
});
