import type { AttributeType } from '@markuplint/ml-spec';

import { createRule, getAttrSpecs, getSpec } from '@markuplint/ml-core';

import { attrCheck } from '../attr-check.js';
import { log as ruleLog } from '../debug.js';
import { isValidAttr, match } from '../helpers.js';

import meta from './meta.js';

const log = ruleLog.extend('invalid-attr');

type Option = {
	/**
	 * @since 3.7.0
	 */
	allowAttrs?: (string | Attr)[] | Record<string, ValueRule>;

	/**
	 * @since 3.7.0
	 */
	disallowAttrs?: (string | Attr)[] | Record<string, ValueRule>;

	ignoreAttrNamePrefix?: string | string[];
	allowToAddPropertiesForPretender?: boolean;

	/**
	 * @deprecated Since version 3.7.0. Use `allowAttrs` or `disallowAttrs` instead.
	 * This option (`attr`) is now considered ambiguous and may lead to confusion.
	 * Please use the more explicit `allowAttrs` or `disallowAttrs` option
	 * to specify allowed attributes for the `invalid-attr` rule.
	 * @see {@link Option.allowAttrs}
	 * @see {@link Option.disallowAttrs}
	 */
	attrs?: Record<
		string,
		| ValueRule
		| {
				disallowed: true;
		  }
	>;
};

type Attr = {
	name: string;
	value: AttributeType | ValueRule;
};

type ValueRule =
	| {
			enum: [string, ...string[]];
	  }
	| {
			pattern: string;
	  }
	| {
			type: AttributeType;
	  };

export default createRule<boolean, Option>({
	meta: meta,
	defaultOptions: {},
	async verify({ document, report, t }) {
		await document.walkOn('Attr', attr => {
			// Default
			const allowToAddPropertiesForPretender = attr.rule.options.allowToAddPropertiesForPretender ?? true;

			if (attr.isDirective) {
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
			const allowAttrs: Record<string, ValueRule> = {};
			const disallowAttrs: Record<string, ValueRule> = {};

			if (attr.rule.options.allowAttrs) {
				if (Array.isArray(attr.rule.options.allowAttrs)) {
					for (const allowAttr of attr.rule.options.allowAttrs) {
						if (typeof allowAttr === 'string') {
							allowAttrs[allowAttr] = { type: 'Any' };
							continue;
						}
						if (isValueRule(allowAttr.value)) {
							allowAttrs[allowAttr.name] = allowAttr.value;
							continue;
						}
						allowAttrs[allowAttr.name] = { type: allowAttr.value };
					}
				} else {
					for (const [attrName, valueRule] of Object.entries(attr.rule.options.allowAttrs)) {
						allowAttrs[attrName] = valueRule;
					}
				}
			}

			if (attr.rule.options.disallowAttrs) {
				if (Array.isArray(attr.rule.options.disallowAttrs)) {
					for (const disallowAttr of attr.rule.options.disallowAttrs) {
						if (typeof disallowAttr === 'string') {
							disallowAttrs[disallowAttr] = { type: 'Any' };
							continue;
						}
						if (isValueRule(disallowAttr.value)) {
							disallowAttrs[disallowAttr.name] = disallowAttr.value;
							continue;
						}
						disallowAttrs[disallowAttr.name] = { type: disallowAttr.value };
					}
				} else {
					for (const [attrName, valueRule] of Object.entries(attr.rule.options.disallowAttrs)) {
						disallowAttrs[attrName] = valueRule;
					}
				}
			}

			if (attr.rule.options.attrs) {
				for (const [attrName, valueRule] of Object.entries(attr.rule.options.attrs)) {
					if ('disallowed' in valueRule) {
						disallowAttrs[attrName] = { type: 'Any' };
					} else {
						allowAttrs[attrName] = valueRule;
					}
				}
			}

			const allowValue = allowAttrs[name] ?? null;
			const disallowValue = disallowAttrs[name] ?? null;

			if (allowValue) {
				if ('enum' in allowValue) {
					invalid = attrCheck(t, name.toLowerCase(), value, true, {
						name,
						type: {
							enum: allowValue.enum,
						},
						description: '',
					});
				} else if ('pattern' in allowValue) {
					if (!match(value, allowValue.pattern)) {
						invalid = {
							invalidType: 'invalid-value',
							message: t(
								'{0} is unmatched with the below patterns: {1}',
								t('the "{0*}" {1}', name, 'attribute'),
								allowValue.pattern,
							),
						};
					}
				} else if ('type' in allowValue) {
					invalid = attrCheck(t, name, value, true, { name, type: allowValue.type, description: '' });
				}
			} else if (disallowValue) {
				if ('enum' in disallowValue) {
					const checkResult = attrCheck(t, name.toLowerCase(), value, true, {
						name,
						type: {
							enum: disallowValue.enum,
						},
						description: '',
					});
					if (checkResult === false) {
						invalid = {
							invalidType: 'invalid-value',
							message: t(
								'{0} is disallowed to accept the following values: {1}',
								t('the "{0*}" {1}', name, 'attribute'),
								t(disallowValue.enum),
							),
						};
					}
				} else if ('pattern' in disallowValue) {
					if (match(value, disallowValue.pattern)) {
						invalid = {
							invalidType: 'invalid-value',
							message: t(
								'{0} is matched with the below disallowed patterns: {1}',
								t('the "{0*}" {1}', name, 'attribute'),
								disallowValue.pattern,
							),
						};
					}
				} else if ('type' in disallowValue) {
					if (disallowValue.type === 'Any') {
						invalid = {
							invalidType: 'non-existent',
							message: t('{0} is disallowed', t('the "{0*}" {1}', name, 'attribute')),
						};
					} else {
						const checkResult = attrCheck(t, name, value, true, {
							name,
							type: disallowValue.type,
							description: '',
						});
						if (checkResult === false) {
							invalid = {
								invalidType: 'invalid-value',
								message: t(
									'{0} is disallowed',
									t('{0} of {1}', t('the {0}', 'type'), t('the "{0*}" {1}', name, 'attribute')),
								),
							};
						}
					}
				}
			} else if (attr.ownerElement.elementType === 'html' && attrSpecs) {
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

function isValueRule(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	value: AttributeType | ValueRule,
): value is ValueRule {
	if (typeof value === 'string') {
		return false;
	}
	if ('enum' in value) {
		if (Object.keys(value).length > 1) {
			return false;
		}
		return true;
	}
	if ('token' in value) {
		return false;
	}
	if ('pattern' in value) {
		return true;
	}
	if (value.type === 'integer' || value.type === 'float') {
		return false;
	}
	if (Object.keys(value).length > 1) {
		return false;
	}
	return true;
}
