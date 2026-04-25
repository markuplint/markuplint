import type { AttributeType } from '@markuplint/ml-spec';
import type { Pattern, Type } from '@markuplint/types';

import { createRule, getAttrSpecs, getSpec } from '@markuplint/ml-core';
import { check, isEnum, isPattern } from '@markuplint/types';

import { attrCheck } from '../attr-check.js';
import { log as ruleLog } from '../debug.js';
import { isValidAttr } from '../helpers.js';

import meta from './meta.js';

const log = ruleLog.extend('invalid-attr');

/**
 * Configuration options for the `invalid-attr` rule.
 */
type Option = {
	/**
	 * Attributes to allow beyond what the spec permits.
	 * Can override spec-level restrictions such as `noUse`.
	 *
	 * @since 3.7.0
	 */
	allowAttrs?: (string | Attr)[] | Record<string, AttributeType | Pattern>;

	/**
	 * Attributes to disallow in addition to spec restrictions.
	 *
	 * @since 3.7.0
	 */
	disallowAttrs?: (string | Attr)[] | Record<string, AttributeType | Pattern>;

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

/**
 * Rule that validates attributes against the HTML spec, allowed lists,
 * and disallowed lists.
 *
 * Checks each attribute for: existence in the spec, correct value type,
 * allowed/disallowed overrides from configuration, and typo suggestions
 * via candidate matching. Supports `allowAttrs` and `disallowAttrs`.
 * Non-existent attributes on elements that allow additional properties
 * (pretenders) can be optionally permitted.
 */
export default createRule<boolean, Option>({
	meta: meta,
	defaultOptions: {},
	async verify({ document, report, t }) {
		// Named rule groups wrap this base rule (e.g., `a11y/no-accesskey`,
		// `a11y/tabindex-restrict`). Virtual rules are narrow by design: they
		// only check the attributes listed in their `allowAttrs`/`disallowAttrs`
		// options. Spec validation is the base rule's job — otherwise every
		// virtual rule wrapping `invalid-attr` would duplicate spec errors
		// (see #3803).
		const isVirtualRule = document.currentRule?.baseRuleId != null;

		await document.walkOn('Attr', attr => {
			// Default
			const allowToAddPropertiesForPretender = attr.rule.options.allowToAddPropertiesForPretender ?? true;

			if (attr.isDirective) {
				return;
			}

			// https://html.spec.whatwg.org/multipage/custom-elements.html#attr-is
			// "The is attribute must not be specified on an autonomous custom element"
			if (attr.name === 'is' && attr.ownerElement.elementType === 'web-component') {
				report({
					scope: attr,
					line: attr.nameNode?.startLine,
					col: attr.nameNode?.startCol,
					raw: attr.nameNode?.raw,
					message: t('The "{0}" attribute must not be specified on an autonomous custom element', 'is'),
				});
				return;
			}

			const attrSpecs = getAttrSpecs(attr.ownerElement, document.specs);

			const attrName = attr.nameNode;
			const name = attr.name;

			if (attr.ownerElement.elementType === 'html' && attr.candidate) {
				const message =
					t('{0} is {1:c}', t('the "{0*}" {1}', name, 'attribute'), 'disallowed') +
					t('. ') +
					t('Did you mean "{0}"?', attr.candidate);
				report({
					scope: attr,
					line: attrName?.startLine,
					col: attrName?.startCol,
					raw: attrName?.raw,
					message: message,
				});
				return;
			}

			const valueNode = attr.valueNode;
			const value = attr.value;

			if (attr.rule.options.ignoreAttrNamePrefix != null) {
				const ignoreAttrNamePrefixes = Array.isArray(attr.rule.options.ignoreAttrNamePrefix)
					? attr.rule.options.ignoreAttrNamePrefix
					: [attr.rule.options.ignoreAttrNamePrefix];
				if (ignoreAttrNamePrefixes.some(prefix => name.indexOf(prefix) === 0)) {
					return;
				}
			}

			let invalid: ReturnType<typeof attrCheck> = false;
			const allowAttrs: Record<string, AttributeType | Pattern> = {};
			const disallowAttrs: Record<string, AttributeType | Pattern> = {};

			if (attr.rule.options.allowAttrs) {
				if (Array.isArray(attr.rule.options.allowAttrs)) {
					for (const allowAttr of attr.rule.options.allowAttrs) {
						if (typeof allowAttr === 'string') {
							allowAttrs[allowAttr] = 'Any';
							continue;
						}
						allowAttrs[allowAttr.name] = allowAttr.value;
					}
				} else {
					for (const [attrName, attrType] of Object.entries(attr.rule.options.allowAttrs)) {
						allowAttrs[attrName] = attrType;
					}
				}
			}

			if (attr.rule.options.disallowAttrs) {
				if (Array.isArray(attr.rule.options.disallowAttrs)) {
					for (const disallowAttr of attr.rule.options.disallowAttrs) {
						if (typeof disallowAttr === 'string') {
							disallowAttrs[disallowAttr] = 'Any';
							continue;
						}
						disallowAttrs[disallowAttr.name] = disallowAttr.value;
					}
				} else {
					for (const [attrName, attrType] of Object.entries(attr.rule.options.disallowAttrs)) {
						disallowAttrs[attrName] = attrType;
					}
				}
			}

			const allowValue = allowAttrs[name] ?? null;
			const disallowValue = disallowAttrs[name] ?? null;

			if (allowValue !== null) {
				invalid = attrCheck(t, name, value, true, {
					name,
					type: allowValue as AttributeType,
					description: '',
				});
			} else if (disallowValue !== null) {
				if (disallowValue === 'Any') {
					invalid = {
						invalidType: 'non-existent',
						message: t('{0} is disallowed', t('the "{0*}" {1}', name, 'attribute')),
					};
				} else {
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
					if (isMatched) {
						invalid = {
							invalidType: 'invalid-value',
							message: createDisallowMessage(t, name, disallowValue),
						};
					}
				}
			} else if (!isVirtualRule && attr.ownerElement.elementType === 'html' && attrSpecs) {
				log('Checking %s[%s="%s"]', attr.nodeName, name, value);
				invalid = isValidAttr(t, name, value, attr.isDynamicValue || false, attr.ownerElement, attrSpecs, log);
			}

			const invalidList = Array.isArray(invalid) ? invalid : [invalid];

			for (const invalid of invalidList) {
				if (invalid !== false) {
					switch (invalid.invalidType) {
						case 'disallowed-attr': {
							report({
								scope: attr,
								message: invalid.message,
							});
							break;
						}
						case 'invalid-value': {
							if (attr.isDynamicValue) {
								break;
							}
							report({
								scope: attr,
								message: invalid.message,
								line: (valueNode?.startLine ?? 0) + (invalid.loc?.line ?? 0),
								col:
									invalid.loc && invalid.loc.line > 0
										? invalid.loc?.col + 1
										: (valueNode?.startCol ?? 0) + (invalid.loc?.col ?? 0),
								raw: invalid.loc?.raw ?? value,
							});
							break;
						}
						case 'non-existent': {
							if (
								allowToAddPropertiesForPretender &&
								attr.ownerElement.pretenderContext?.type === 'origin'
							) {
								return;
							}

							const spec = getSpec(attr.ownerElement, document.specs.specs);
							if (spec?.possibleToAddProperties) {
								return;
							}

							report({
								scope: attr,
								message: invalid.message,
								line: attrName?.startLine,
								col: attrName?.startCol,
								raw: attrName?.raw,
							});
						}
					}
				}
			}
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
