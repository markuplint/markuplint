import type { AttributeType } from '@markuplint/ml-spec';
import type { Pattern, Type } from '@markuplint/types';

import { createRule } from '@markuplint/ml-core';
import { check, isEnum, isPattern } from '@markuplint/types';

import { attrCheck } from '../attr-check.js';

import meta from './meta.js';

/**
 * Configuration options for the `no-restricted-attr` rule.
 */
type Option = {
	/**
	 * Attributes to disallow, in addition to whatever the HTML spec (checked
	 * by `no-unknown-attr` / `no-disallowed-attr` / `no-invalid-attr-value`)
	 * already restricts. This is the rule's only concern — narrow, purely
	 * user-defined denylisting, independent of spec conformance.
	 *
	 * @since 3.7.0
	 */
	disallowAttrs?: (string | Attr)[] | Record<string, AttributeType | Pattern>;
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

function disallowedTypes(disallowAttrs: Option['disallowAttrs']): Map<string, AttributeType | Pattern | 'Any'> {
	const map = new Map<string, AttributeType | Pattern | 'Any'>();
	if (!disallowAttrs) {
		return map;
	}
	if (Array.isArray(disallowAttrs)) {
		for (const disallowAttr of disallowAttrs) {
			if (typeof disallowAttr === 'string') {
				map.set(disallowAttr, 'Any');
				continue;
			}
			map.set(disallowAttr.name, disallowAttr.value);
		}
	} else {
		for (const [name, type] of Object.entries(disallowAttrs)) {
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
			const attrName = attr.nameNode;

			const disallowValue = disallowedTypes(attr.rule.options.disallowAttrs).get(name);
			if (disallowValue === undefined) {
				return;
			}

			if (disallowValue === 'Any') {
				report({
					scope: attr,
					message: t('{0} is disallowed', t('the "{0*}" {1}', name, 'attribute')),
					line: attrName?.startLine,
					col: attrName?.startCol,
					raw: attrName?.raw,
				});
				return;
			}

			if (attr.isDynamicValue) {
				return;
			}

			const checkResult = isPattern(disallowValue as Type)
				? check(value, disallowValue as Type)
				: attrCheck(t, name, value, true, {
						name,
						type: disallowValue as AttributeType,
						description: '',
					});
			const isMatched = isPattern(disallowValue as Type)
				? (checkResult as { matched: boolean }).matched
				: checkResult === false;

			if (!isMatched) {
				return;
			}

			report({
				scope: attr,
				message: createDisallowMessage(t, name, disallowValue),
				line: valueNode?.startLine,
				col: valueNode?.startCol,
				raw: value,
			});
		});
	},
});

/**
 * Creates an appropriate disallow message based on the type structure.
 *
 * @param t - The i18n translator
 * @param name - The attribute name
 * @param type - The attribute type or pattern
 * @returns A localized message string
 */
function createDisallowMessage(
	t: Parameters<typeof attrCheck>[0],
	name: string,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	type: AttributeType | Pattern,
): string {
	if (isPattern(type as Type)) {
		return t(
			'{0} is matched with the below disallowed patterns: {1}',
			t('the "{0*}" {1}', name, 'attribute'),
			(type as Pattern).pattern,
		);
	}
	if (typeof type !== 'string' && isEnum(type)) {
		return t(
			'{0} is disallowed to accept the following values: {1}',
			t('the "{0*}" {1}', name, 'attribute'),
			t(type.enum),
		);
	}
	return t('{0} is disallowed', t('{0} of {1}', t('the {0}', 'type'), t('the "{0*}" {1}', name, 'attribute')));
}
