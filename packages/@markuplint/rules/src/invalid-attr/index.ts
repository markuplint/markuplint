import type { AttributeType } from '@markuplint/ml-spec';

import { createRule, getAttrSpecs, getSpec } from '@markuplint/ml-core';

import { attrCheck } from '../attr-check';
import { log as ruleLog } from '../debug';
import { isValidAttr, match } from '../helpers';

const log = ruleLog.extend('invalid-attr');

type Option = {
	attrs?: Record<string, Rule>;
	ignoreAttrNamePrefix?: string | string[];
};

type Rule =
	| {
			enum: [string, ...string[]];
	  }
	| {
			pattern: string;
	  }
	| {
			type: AttributeType;
	  }
	| {
			disallowed: true;
	  };

export default createRule<boolean, Option>({
	defaultOptions: {},
	verify({ document, report, t }) {
		void document.walkOn('Attr', attr => {
			if (attr.isDirective) {
				return;
			}

			const attrSpecs = getAttrSpecs(attr.ownerElement, document.specs);

			const attrName = attr.nameNode;
			const name = attr.name;

			if (!attr.ownerElement.isCustomElement && attr.candidate) {
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

			if (attr.rule.option.ignoreAttrNamePrefix) {
				const ignoreAttrNamePrefixes = Array.isArray(attr.rule.option.ignoreAttrNamePrefix)
					? attr.rule.option.ignoreAttrNamePrefix
					: [attr.rule.option.ignoreAttrNamePrefix];
				if (ignoreAttrNamePrefixes.some(prefix => name.indexOf(prefix) === 0)) {
					return;
				}
			}

			let invalid: ReturnType<typeof attrCheck> = false;
			const customRule = attr.rule.option.attrs ? attr.rule.option.attrs[name] : null;

			if (customRule) {
				if ('enum' in customRule) {
					invalid = attrCheck(t, name.toLowerCase(), value, true, {
						name,
						type: {
							enum: customRule.enum,
						},
						description: '',
					});
				} else if ('pattern' in customRule) {
					if (!match(value, customRule.pattern)) {
						invalid = {
							invalidType: 'invalid-value',
							message: t(
								'{0} is unmatched with the below patterns: {1}',
								t('the "{0*}" {1}', name, 'attribute'),
								customRule.pattern,
							),
						};
					}
				} else if ('type' in customRule) {
					invalid = attrCheck(t, name, value, true, { name, type: customRule.type, description: '' });
				} else if ('disallowed' in customRule && customRule.disallowed) {
					invalid = {
						invalidType: 'non-existent',
						message: t('{0} is disallowed', t('the "{0*}" {1}', name, 'attribute')),
					};
				}
			} else if (!attr.ownerElement.isCustomElement && attrSpecs) {
				log('Checking %s[%s="%s"]', attr.nodeName, name, value);
				invalid = isValidAttr(t, name, value, attr.isDynamicValue || false, attr.ownerElement, attrSpecs, log);
			}

			if (invalid) {
				switch (invalid.invalidType) {
					case 'invalid-value': {
						if (attr.isDynamicValue) {
							break;
						}
						report({
							scope: attr,
							message: invalid.message,
							line: (valueNode?.startLine ?? 0) + (invalid.loc?.line ?? 0),
							col: invalid.loc?.line
								? invalid.loc?.col + 1
								: (valueNode?.startCol ?? 0) + (invalid.loc?.col ?? 0),
							raw: invalid.loc?.raw ?? value,
						});
						break;
					}
					case 'non-existent': {
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
		});
	},
});
