import { Result, createRule } from '@markuplint/ml-core';
import { attrMatches, attrSpecs, getSpec, isCustomElement, match } from '../helpers';
import { AttributeType } from '@markuplint/ml-spec/src';
import { typeCheck } from './type-check';

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
	async verify(document, translate) {
		const spec = getSpec(document.schemas);
		const reports: Result[] = [];

		await document.walkOn('Element', async node => {
			const attributeSpecs = attrSpecs(node.nodeName, spec);

			for (const attr of node.attributes) {
				if (attr.attrType === 'html-attr' && attr.isDirective) {
					continue;
				}

				const attrName = attr.getName();
				const name = attrName.potential;
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

				let invalid: ReturnType<typeof typeCheck> = false;
				const customRule = node.rule.option.attrs ? node.rule.option.attrs[name] : null;

				if (customRule) {
					if ('enum' in customRule) {
						invalid = typeCheck(name.toLowerCase(), value, true, {
							name,
							type: 'String',
							enum: customRule.enum,
							description: '',
						});
					} else if ('pattern' in customRule) {
						if (!match(value, customRule.pattern)) {
							invalid = {
								invalidType: 'invalid-value',
								message: `The "${name}" attribute expect custom pattern "${customRule.pattern}"`,
							};
						}
					} else if ('type' in customRule) {
						invalid = typeCheck(name, value, true, { name, type: customRule.type, description: '' });
					}
				} else if (!isCustomElement(node.nodeName) && attributeSpecs) {
					const spec = attributeSpecs.find(s => s.name === name);
					invalid = typeCheck(name, value, false, spec);
					if (!invalid && spec && !attrMatches(node, spec.condition)) {
						invalid = {
							invalidType: 'non-existent',
							message: `The "${name}" attribute is not allowed`,
						};
					}
					if (
						invalid &&
						invalid.invalidType === 'invalid-value' &&
						attr.attrType === 'html-attr' &&
						attr.isDynamicValue
					) {
						invalid = false;
					}
				}

				if (invalid) {
					switch (invalid.invalidType) {
						case 'invalid-value': {
							reports.push({
								severity: node.rule.severity,
								message: invalid.message,
								line: attrValue.line,
								col: attrValue.col,
								raw: value,
							});
							break;
						}
						case 'non-existent': {
							reports.push({
								severity: node.rule.severity,
								message: invalid.message,
								line: attrName.line,
								col: attrName.col,
								raw: name,
							});
						}
					}
				}
			}
		});

		return reports;
	},
});
