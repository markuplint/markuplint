import { Result, createRule } from '@markuplint/ml-core';
import { attrSpecs, match } from '../helpers';
import { AttributeType } from '@markuplint/ml-spec/src';
import { typeCheck } from './type-check';

type Option = Record<string, Rule>;

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
			const attributeSpecs = attrSpecs(node.nodeName);

			for (const attr of node.attributes) {
				let invalid: ReturnType<typeof typeCheck> = false;
				const name = attr.name.raw.toLowerCase();
				const customRule = node.rule.option[name];

				if (customRule) {
					if ('enum' in customRule) {
						invalid = typeCheck(attr, [{ name, type: 'String', enum: customRule.enum, description: '' }]);
					} else if ('pattern' in customRule) {
						if (!match(attr.value.raw, customRule.pattern)) {
							invalid = {
								invalidType: 'invalid-value',
								message: `The "${name}" attribute expect custom pattern "${customRule.pattern}"`,
							};
						}
					} else if ('type' in customRule) {
						invalid = typeCheck(attr, [{ name, type: customRule.type, description: '' }]);
					}
				} else {
					invalid = typeCheck(attr, attributeSpecs);
				}

				if (invalid) {
					switch (invalid.invalidType) {
						case 'invalid-value': {
							reports.push({
								severity: node.rule.severity,
								message: invalid.message,
								line: attr.value.startLine,
								col: attr.value.startCol,
								raw: attr.value.raw,
							});
							break;
						}
						case 'non-existent': {
							reports.push({
								severity: node.rule.severity,
								message: invalid.message,
								line: attr.name.startLine,
								col: attr.name.startCol,
								raw: attr.name.raw,
							});
						}
					}
				}
			}
		});

		return reports;
	},
});
