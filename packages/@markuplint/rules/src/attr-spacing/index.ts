import { Result, createRule } from '@markuplint/ml-core';

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
	async verify(document, messages) {
		const reports: Result[] = [];
		// const message = messages('error');
		await document.walkOn('Element', async node => {
			const attrs = node.attributes;
			for (const attr of attrs) {
				const hasSpace = !!attr.spacesBeforeName.raw;
				const hasLineBreak = /\r?\n/.test(attr.spacesBeforeName.raw);
				// console.log({ attr: `${attr.spacesBeforeName.raw}${attr.raw}`, hasSpace, hasLineBreak });
				if (!hasSpace) {
					reports.push({
						severity: node.rule.severity,
						message: messages('スペースが必要です'),
						line: attr.spacesBeforeName.startLine,
						col: attr.spacesBeforeName.startCol,
						raw: attr.spacesBeforeName.raw,
					});
				} else {
					if (hasLineBreak) {
						if (node.rule.option.lineBreak === 'never') {
							reports.push({
								severity: node.rule.severity,
								message: messages('改行はしないでください'),
								line: attr.spacesBeforeName.startLine,
								col: attr.spacesBeforeName.startCol,
								raw: attr.spacesBeforeName.raw,
							});
						}
					} else {
						if (node.rule.option.lineBreak === 'always') {
							reports.push({
								severity: node.rule.severity,
								message: messages('改行してください'),
								line: attr.spacesBeforeName.startLine,
								col: attr.spacesBeforeName.startCol,
								raw: attr.spacesBeforeName.raw,
							});
						}
						if (node.rule.option.width && node.rule.option.width !== attr.spacesBeforeName.raw.length) {
							reports.push({
								severity: node.rule.severity,
								message: messages('スペースは{0}つにしてください', node.rule.option.width),
								line: attr.spacesBeforeName.startLine,
								col: attr.spacesBeforeName.startCol,
								raw: attr.spacesBeforeName.raw,
							});
						}
					}
				}
			}
		});
		return reports;
	},
	async fix(document) {
		await document.walkOn('Element', async node => {
			const attrs = node.attributes;
			for (const attr of attrs) {
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
							const expectIndent = node.indentation ? node.indentation.raw : '';
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
