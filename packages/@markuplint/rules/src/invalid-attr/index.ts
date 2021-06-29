import { Result, createRule } from '@markuplint/ml-core';
import { attrMatches, getAttrSpecs, match } from '../helpers';
import { AttributeType } from '@markuplint/ml-spec/src';
import { typeCheck } from '../type-check';

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
		const reports: Result[] = [];

		await document.walkOn('Element', async node => {
			const attrSpecs = getAttrSpecs(node.nodeName, document.specs);

			for (const attr of node.attributes) {
				if (attr.attrType === 'html-attr' && attr.isDirective) {
					continue;
				}

				const attrName = attr.getName();
				const name = attrName.potential;

				if (attr.attrType === 'html-attr' && attr.isInvalid) {
					const candidate = attr.candidate;
					const message =
						`The "${attrName.raw}" attribute is not allowed.` +
						(candidate ? ` Did you mean "${candidate}"?` : '');
					reports.push({
						severity: node.rule.severity,
						message: message,
						line: attrName.line,
						col: attrName.col,
						raw: attrName.raw,
					});
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
				} else if (!node.isCustomElement && attrSpecs) {
					const spec = attrSpecs.find(s => s.name === name);
					invalid = typeCheck(name, value, false, spec);
					if (
						!invalid &&
						spec &&
						spec.condition &&
						!node.hasSpreadAttr &&
						!attrMatches(node, spec.condition)
					) {
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
								raw: attrName.raw,
							});
						}
					}
				}
			}
		});

		return reports;
	},
});
