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
	 * A name is compared as the DOM compares attribute names.
	 *
	 * @see https://markuplint.dev/docs/rules/no-unknown-attr#attribute-name-case
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

/**
 * @param value - A string
 * @returns The string with the ASCII upper case letters turned into lower case, and nothing else
 *   (the comparison that the HTML Standard calls "ASCII case-insensitive")
 */
function asciiLowerCase(value: string) {
	return value.replaceAll(/[A-Z]/g, letter => letter.toLowerCase());
}

export default createRule<boolean, Option>({
	meta: meta,
	defaultOptions: {},
	async verify({ document, report, t }) {
		// Whether an entry of `allowAttrs` is the attribute is up to the attribute: the DOM decides
		// whether two spellings are one name (`MLAttr#isNamedBy`).
		const lookupAllowed = createNameOptionLookup<AttributeType | Pattern>('Any');

		await document.walkOn('Attr', attr => {
			// Of two attributes of one name, the element has the other one (`no-duplicate-attr` reports this one)
			if (attr.overridden) {
				return;
			}
			if (attr.isDirective) {
				return;
			}

			const name = attr.name;
			const value = attr.value;
			const valueNode = attr.valueNode;

			const allowType = lookupAllowed(attr.rule.options.allowAttrs, attr);

			let invalid: ReturnType<typeof attrCheck> = false;
			let sameValueAs: string | undefined;

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
				sameValueAs = eligibility.spec.sameValueAs;
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

			// The attribute that this one has to have the value of: when it is absent the attribute is not allowed
			// (`condition`), which is not this rule's to say, and a value that is code is not compared
			const other = sameValueAs === undefined ? null : attr.ownerElement.getAttributeNode(sameValueAs);
			if (
				other &&
				!other.isDynamicValue &&
				!other.isAbsent &&
				asciiLowerCase(other.value) !== asciiLowerCase(value)
			) {
				report({
					scope: attr,
					message: t('{0} expects {1}', t('the "{0*}" {1}', name, 'attribute'), `"${other.value}"`),
					...(valueNode ? { line: valueNode.startLine, col: valueNode.startCol, raw: valueNode.raw } : {}),
				});
			}

			const invalidList = Array.isArray(invalid) ? invalid : [invalid];

			for (const one of invalidList) {
				if (one === false || one.invalidType !== 'invalid-value') {
					continue;
				}
				// The value of an expression is what the code results in, so a position in it is not a position
				// in the source (an escape, a quote): the whole value that is written is reported
				if (attr.isExpressionValue && valueNode) {
					report({
						scope: attr,
						message: one.message,
						line: valueNode.startLine,
						col: valueNode.startCol,
						raw: valueNode.raw,
					});
					continue;
				}
				// The value is the source with its character references decoded: the part is reported where it is written
				const offset = one.loc ? offsetInValue(value, one.loc.line, one.loc.col) : null;
				const located =
					one.loc && offset !== null ? attr.locateInValue(offset, offset + one.loc.raw.length) : null;
				if (located) {
					report({
						scope: attr,
						message: one.message,
						line: located.startLine,
						col: located.startCol,
						raw: located.raw,
					});
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

/**
 * @param value - The value that is checked
 * @param line - The line of a part of it, from 0
 * @param col - The column of the part in its line, from 0
 * @returns The offset of the part in the value, or null when the value has no such place
 */
function offsetInValue(value: string, line: number, col: number): number | null {
	let offset = 0;
	for (let i = 0; i < line; i++) {
		const lineBreak = value.indexOf('\n', offset);
		if (lineBreak === -1) {
			return null;
		}
		offset = lineBreak + 1;
	}
	offset += col;
	return offset <= value.length ? offset : null;
}
