import type { AttributeType } from '@markuplint/ml-spec';
import type { Pattern } from '@markuplint/types';

import { createRule, getAttrSpecs } from '@markuplint/ml-core';

import { attrCheck } from '../attr-check.js';
import { resolveAttrEligibility } from '../attr-eligibility.js';
import { log as ruleLog } from '../debug.js';
import { createNameOptionLookup } from '../helpers.js';

import meta from './meta.js';

const log = ruleLog.extend('no-invalid-attr-value');

/**
 * Configuration options for the `no-invalid-attr-value` rule.
 */
type Option = {
	/**
	 * Attribute names to treat as known, beyond what the spec defines, with
	 * the type or pattern their value must match. Shares its shape with
	 * `no-unknown-attr`'s option of the same name — the name-eligibility half
	 * lives there, this rule only consumes the value constraint.
	 *
	 * A name is compared as the DOM compares attribute names, so it is ASCII case-insensitive in the
	 * HTML syntax and for an HTML element that code sets through the DOM API (JSX, MDX, Vue), exact for an
	 * SVG/MathML element there, and a component's props are not folded.
	 *
	 * @since 3.7.0
	 */
	allowAttrs?: (string | Attr)[] | Record<string, AttributeType | Pattern>;
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
		// Whether an entry of `allowAttrs` is the attribute is up to the attribute: the DOM decides
		// whether two spellings are one name (`MLAttr#isNamedBy`).
		const lookupAllowed = createNameOptionLookup<AttributeType | Pattern>('Any');

		await document.walkOn('Attr', attr => {
			if (attr.isDirective) {
				return;
			}

			const name = attr.name;
			const value = attr.value;
			const valueNode = attr.valueNode;

			const allowType = lookupAllowed(attr.rule.options.allowAttrs, attr);

			let invalid: ReturnType<typeof attrCheck> = false;

			if (allowType === undefined) {
				if (attr.ownerElement.elementType !== 'html') {
					return;
				}
				const attrSpecs = getAttrSpecs(attr.ownerElement, document.specs);
				if (!attrSpecs) {
					return;
				}
				if (log.enabled) {
					log('Checking %s[%s="%s"]', attr.nodeName, name, value);
				}
				const eligibility = resolveAttrEligibility(name, attr.ownerElement, attrSpecs, attr);
				if (eligibility.status !== 'ok') {
					return;
				}
				invalid = attrCheck(t, name, value, false, eligibility.spec);
			} else {
				invalid = attrCheck(t, name, value, true, {
					name,
					type: allowType,
					description: '',
				});
			}

			if (attr.isDynamicValue) {
				return;
			}

			const invalidList = Array.isArray(invalid) ? invalid : [invalid];

			for (const one of invalidList) {
				if (one === false || one.invalidType !== 'invalid-value') {
					continue;
				}
				report({
					scope: attr,
					message: one.message,
					line: (valueNode?.startLine ?? 0) + (one.loc?.line ?? 0),
					col:
						one.loc && one.loc.line > 0
							? one.loc.col + 1
							: (valueNode?.startCol ?? 0) + (one.loc?.col ?? 0),
					raw: one.loc?.raw ?? value,
				});
			}
		});
	},
});
