import { createRule } from '@markuplint/ml-core';

type Value = 'always' | 'never' | 'always-single-line' | 'never-single-line';

const alwaysMsg = 'Always insert {0} after {1} of {2}';
const neverMsg = 'Never insert {0} after {1} of {2}';

export default createRule<Value>({
	defaultServerity: 'warning',
	defaultValue: 'never',
	async verify(context) {
		await context.document.walkOn('Element', node => {
			for (const attr of node.attributes) {
				if (attr.attrType === 'ps-attr' || !(attr.equal && attr.spacesAfterEqual && attr.spacesBeforeEqual)) {
					continue;
				}
				const hasSpace = !!attr.spacesAfterEqual.raw;
				const hasLineBreak = /\r?\n/.test(attr.spacesAfterEqual.raw);
				let isBad = false;
				let rawMessage: string;

				switch (node.rule.value) {
					case 'always': {
						isBad = !hasSpace;
						rawMessage = alwaysMsg;
						break;
					}
					case 'never': {
						isBad = hasSpace;
						rawMessage = neverMsg;
						break;
					}
					case 'always-single-line': {
						// or 'no-newline'
						isBad = !hasSpace || hasLineBreak;
						rawMessage = alwaysMsg;
						break;
					}
					case 'never-single-line': {
						isBad = hasSpace && !hasLineBreak;
						rawMessage = neverMsg;
						break;
					}
				}
				if (isBad) {
					context.report({
						scope: node,
						message: context.translate(rawMessage, 'space', 'equal sign', 'attribute'),
						line: attr.spacesBeforeEqual.startLine,
						col: attr.spacesBeforeEqual.startCol,
						raw: attr.spacesBeforeEqual.raw + attr.equal.raw + attr.spacesAfterEqual.raw,
					});
				}
			}
		});
	},
	async fix({ document }) {
		await document.walkOn('Element', node => {
			for (const attr of node.attributes) {
				if (attr.attrType === 'ps-attr' || !(attr.equal && attr.spacesAfterEqual && attr.spacesBeforeEqual)) {
					continue;
				}
				const hasSpace = !!attr.spacesAfterEqual.raw;
				const hasLineBreak = /\r?\n/.test(attr.spacesAfterEqual.raw);
				switch (node.rule.value) {
					case 'always': {
						if (!hasSpace) {
							attr.spacesAfterEqual.fix(' ');
						}
						break;
					}
					case 'never': {
						attr.spacesAfterEqual.fix('');
						break;
					}
					case 'always-single-line': {
						// or 'no-newline'
						if (!hasSpace || hasLineBreak) {
							attr.spacesAfterEqual.fix(' ');
						}
						break;
					}
					case 'never-single-line': {
						if (hasSpace && !hasLineBreak) {
							attr.spacesAfterEqual.fix('');
						}
						break;
					}
				}
			}
		});
	},
});
