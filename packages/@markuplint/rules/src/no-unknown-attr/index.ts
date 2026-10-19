import type { AttributeType } from '@markuplint/ml-spec';
import type { Pattern } from '@markuplint/types';

import { createRule, getAttrSpecs, getSpec } from '@markuplint/ml-core';

import { resolveAttrEligibility, suggestionSuffix } from '../attr-eligibility.js';
import { createNameOptionLookup, createPrefixMatcher } from '../helpers.js';

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
	 * A name is compared as the DOM compares attribute names.
	 *
	 * @see https://markuplint.dev/docs/rules/no-unknown-attr#attribute-name-case
	 * @since 3.7.0
	 */
	allowAttrs?: (string | Attr)[] | Record<string, AttributeType | Pattern>;

	/**
	 * Attribute name prefix(es) to ignore during validation, compared as the DOM compares attribute
	 * names, like `allowAttrs`.
	 */
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

export default createRule<boolean, Option>({
	meta: meta,
	defaultOptions: {},
	async verify({ document, report, t }) {
		// Whether an entry of the options is the attribute is up to the attribute: the DOM decides
		// whether two spellings are one name (`MLAttr#isNamedBy`, `MLAttr#isPrefixedBy`).
		const lookupAllowed = createNameOptionLookup<AttributeType | Pattern>('Any');
		const hasIgnoredPrefix = createPrefixMatcher();

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

			if (hasIgnoredPrefix(attr.rule.options.ignoreAttrNamePrefix, attr)) {
				return;
			}

			// A name listed in `allowAttrs` is allowed whatever its value
			if (lookupAllowed(attr.rule.options.allowAttrs, attr) !== undefined) {
				return;
			}

			if (attr.ownerElement.elementType !== 'html') {
				return;
			}

			const attrSpecs = getAttrSpecs(attr.ownerElement, document.specs);
			if (!attrSpecs) {
				return;
			}

			const eligibility = resolveAttrEligibility(name, attr.ownerElement, attrSpecs, attr);

			let message: string | undefined;
			switch (eligibility.status) {
				case 'unknown': {
					message =
						t('{0} is {1:c}', t('the "{0*}" {1}', name, 'attribute'), 'disallowed') +
						suggestionSuffix(t, eligibility.candidate);
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
