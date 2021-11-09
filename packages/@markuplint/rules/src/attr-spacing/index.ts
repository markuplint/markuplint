import { createRule, getIndent } from '@markuplint/ml-core';

export interface AttrSpasingOptions {
	lineBreak: 'either' | 'always' | 'never';
	width: number | false;
}

export default createRule<boolean, AttrSpasingOptions>({
	name: 'attr-spacing',
	defaultLevel: 'warning',
	defaultValue: true,
	defaultOptions: {
		lineBreak: 'either',
		width: 1,
	},
	async verify(context) {
		await context.document.walkOn('Element', async node => {
			const attrs = node.attributes;
			for (const attr of attrs) {
				if (attr.attrType === 'ps-attr') {
					continue;
				}
				const hasSpace = !!attr.spacesBeforeName.raw;
				const hasLineBreak = /\r?\n/.test(attr.spacesBeforeName.raw);
				// console.log({ attr: `${attr.spacesBeforeName.raw}${attr.raw}`, hasSpace, hasLineBreak });
				if (!hasSpace) {
					context.report({
						scope: node,
						message: context.translate('Required {0}', 'space'),
						line: attr.spacesBeforeName.startLine,
						col: attr.spacesBeforeName.startCol,
						raw: attr.spacesBeforeName.raw,
					});
				} else {
					if (hasLineBreak) {
						if (node.rule.option.lineBreak === 'never') {
							context.report({
								scope: node,
								message: context.translate('Never {0}', 'break line'),
								line: attr.spacesBeforeName.startLine,
								col: attr.spacesBeforeName.startCol,
								raw: attr.spacesBeforeName.raw,
							});
						}
					} else {
						if (node.rule.option.lineBreak === 'always') {
							context.report({
								scope: node,
								message: context.translate('Insert {0}', 'line break'),
								line: attr.spacesBeforeName.startLine,
								col: attr.spacesBeforeName.startCol,
								raw: attr.spacesBeforeName.raw,
							});
						}
						if (node.rule.option.width && node.rule.option.width !== attr.spacesBeforeName.raw.length) {
							context.report({
								scope: node,
								message: context.translate('{0} should be {1}', 'Space', node.rule.option.width),
								line: attr.spacesBeforeName.startLine,
								col: attr.spacesBeforeName.startCol,
								raw: attr.spacesBeforeName.raw,
							});
						}
					}
				}
			}
		});
	},
	async fix({ document }) {
		await document.walkOn('Element', async node => {
			const attrs = node.attributes;
			for (const attr of attrs) {
				if (attr.attrType === 'ps-attr') {
					continue;
				}
				const hasSpace = !!attr.spacesBeforeName.raw;
				const hasLineBreak = /\r?\n/.test(attr.spacesBeforeName.raw);
				const expectWidth = node.rule.option.width || 1;
				const expectSpaces = ' '.repeat(expectWidth);
				if (!hasSpace) {
					attr.spacesBeforeName.fix(expectSpaces);
				} else {
					if (hasLineBreak) {
						if (node.rule.option.lineBreak === 'never') {
							attr.spacesBeforeName.fix(expectSpaces);
						}
					} else {
						if (node.rule.option.lineBreak === 'always') {
							const indent = getIndent(node);
							const expectIndent = indent ? indent.raw : '';
							attr.spacesBeforeName.fix(`\n${expectIndent}`);
						} else if (
							node.rule.option.width &&
							node.rule.option.width !== attr.spacesBeforeName.raw.length
						) {
							attr.spacesBeforeName.fix(expectSpaces);
						}
					}
				}
			}
		});
	},
});
