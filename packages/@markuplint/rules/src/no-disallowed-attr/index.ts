import type { AttributeType } from '@markuplint/ml-spec';
import type { Pattern } from '@markuplint/types';

import { createRule, getAttrSpecs, getSpec } from '@markuplint/ml-core';

import { resolveAttrEligibility } from '../attr-eligibility.js';
import { createNameOptionLookup, createPrefixMatcher } from '../helpers.js';

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

			const name = attr.name;
			const attrName = attr.nameNode;

			// https://html.spec.whatwg.org/multipage/custom-elements.html#attr-is
			// > The exception is the is attribute, which must not be specified on an autonomous custom element (and which will
			// > have no effect if it is).
			if (attr.nameKey === 'is' && attr.ownerElement.elementType === 'web-component') {
				report({
					scope: attr,
					line: attrName?.startLine,
					col: attrName?.startCol,
					raw: attrName?.raw,
					message: t('The "{0}" attribute must not be specified on an autonomous custom element', 'is'),
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
