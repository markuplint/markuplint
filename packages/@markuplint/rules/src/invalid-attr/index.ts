import type { AttributeType } from '@markuplint/ml-spec';

import { createRule } from '@markuplint/ml-core';

import { attrCheck } from '../attr-check';
import { getAttrSpecs, isValidAttr, match } from '../helpers';

type Option = {
	attrs?: Record<string, Rule>;
	ignoreAttrNamePrefix?: string | string[];
};

type Rule =
	| {
			enum: string[];
	  }
	| {
			pattern: string;
	  }
	| {
			type: AttributeType;
	  };

export default createRule<true, Option>({
	name: 'invalid-attr',
	defaultLevel: 'error',
	defaultValue: true,
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
				const value = attrValue.raw;

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
					}
				} else if (!node.isCustomElement && attrSpecs) {
					invalid = isValidAttr(
						t,
						name,
						value,
						(attr.attrType === 'html-attr' && attr.isDynamicValue) || false,
						node,
						attrSpecs,
					);
				}

				if (invalid) {
					switch (invalid.invalidType) {
						case 'invalid-value': {
							report({
								scope: node,
								message: invalid.message,
								line: attrValue.line,
								col: attrValue.col,
								raw: value,
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
