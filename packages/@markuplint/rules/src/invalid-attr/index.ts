import type { AttributeType } from '@markuplint/ml-spec';

import { createRule, getAttrSpecs } from '@markuplint/ml-core';

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
	async verify({ document, report, t }) {
		await document.walkOn('Element', async node => {
			const attrSpecs = getAttrSpecs(node.nameWithNS, document.specs);

			for (const attr of node.attributes) {
				if (attr.attrType === 'html-attr' && attr.isDirective) {
					continue;
				}

				const attrName = attr.getName();
				const name = attrName.potential;

				if (!node.isCustomElement && attr.attrType === 'html-attr' && attr.candidate) {
					const message =
						t('{0} is {1:c}', t('the "{0}" {1}', attrName.raw, 'attribute'), 'disallowed') +
						t('. ') +
						t('Did you mean "{0}"?', attr.candidate);
					report({
						scope: node,
						message: message,
						line: attrName.line,
						col: attrName.col,
						raw: attrName.raw,
					});
					continue;
				}

				const attrValue = attr.getValue();
				const value = attrValue.potential;

				if (node.rule.option.ignoreAttrNamePrefix) {
					const ignoreAttrNamePrefixes = Array.isArray(node.rule.option.ignoreAttrNamePrefix)
						? node.rule.option.ignoreAttrNamePrefix
						: [node.rule.option.ignoreAttrNamePrefix];
					if (ignoreAttrNamePrefixes.some(prefix => name.indexOf(prefix) === 0)) {
						continue;
					}
				}

				let invalid: ReturnType<typeof attrCheck> = false;
				const customRule = node.rule.option.attrs ? node.rule.option.attrs[name] : null;

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
									t('the "{0}" {1}', name, 'attribute'),
									customRule.pattern,
								),
							};
						}
					} else if ('type' in customRule) {
						invalid = attrCheck(t, name, value, true, { name, type: customRule.type, description: '' });
					} else if ('disallowed' in customRule && customRule.disallowed) {
						invalid = {
							invalidType: 'non-existent',
							message: t('{0} is disallowed', t('the "{0}" {1}', name, 'attribute')),
						};
					}
				} else if (!node.isCustomElement && attrSpecs) {
					log('Checking %s[%s="%s"]', node.nodeName, name, value);
					invalid = isValidAttr(
						t,
						name,
						value,
						(attr.attrType === 'html-attr' && attr.isDynamicValue) || false,
						node,
						attrSpecs,
						log,
					);
				}

				if (invalid) {
					switch (invalid.invalidType) {
						case 'invalid-value': {
							report({
								scope: node,
								message: invalid.message,
								line: attrValue.line + (invalid.loc?.line ?? 0),
								col: invalid.loc?.line ? invalid.loc?.col + 1 : attrValue.col + (invalid.loc?.col ?? 0),
								raw: invalid.loc?.raw ?? value,
							});
							break;
						}
						case 'non-existent': {
							report({
								scope: node,
								message: invalid.message,
								line: attrName.line,
								col: attrName.col,
								raw: attrName.raw,
							});
						}
					}
				}
			}
		});
	},
});
