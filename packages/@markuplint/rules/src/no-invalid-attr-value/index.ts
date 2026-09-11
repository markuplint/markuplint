import type { AttributeType } from '@markuplint/ml-spec';
import type { Pattern } from '@markuplint/types';

import { createRule, getAttrSpecs } from '@markuplint/ml-core';

import { attrCheck } from '../attr-check.js';
import { resolveAttrEligibility } from '../attr-eligibility.js';
import { log as ruleLog } from '../debug.js';

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

function allowedTypes(allowAttrs: Option['allowAttrs']): Map<string, AttributeType | Pattern> {
	const map = new Map<string, AttributeType | Pattern>();
	if (!allowAttrs) {
		return map;
	}
	if (Array.isArray(allowAttrs)) {
		for (const allowAttr of allowAttrs) {
			if (typeof allowAttr === 'string') {
				map.set(allowAttr, 'Any');
				continue;
			}
			map.set(allowAttr.name, allowAttr.value);
		}
	} else {
		for (const [name, type] of Object.entries(allowAttrs)) {
			map.set(name, type);
		}
	}
	return map;
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
			const value = attr.value;
			const valueNode = attr.valueNode;

			const allowType = allowedTypes(attr.rule.options.allowAttrs).get(name);

			let invalid: ReturnType<typeof attrCheck> = false;

			if (allowType === undefined) {
				if (attr.ownerElement.elementType !== 'html') {
					return;
				}
				const attrSpecs = getAttrSpecs(attr.ownerElement, document.specs);
				if (!attrSpecs) {
					return;
				}
				log('Checking %s[%s="%s"]', attr.nodeName, name, value);
				const eligibility = resolveAttrEligibility(name, attr.ownerElement, attrSpecs);
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
