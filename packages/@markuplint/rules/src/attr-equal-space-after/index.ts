import { Result, createRule } from '@markuplint/ml-core';

type Value = 'always' | 'never' | 'always-single-line' | 'never-single-line';

export default createRule<Value>({
	name: 'attr-equal-space-after',
	defaultLevel: 'warning',
	defaultValue: 'never',
	defaultOptions: null,
	async verify(document, messages) {
		const reports: Result[] = [];
		// const message = messages('error');
		await document.walkOn('Element', async node => {
			for (const attr of node.attributes) {
				if (!(attr.equal && attr.spacesAfterEqual && attr.spacesBeforeEqual)) {
					continue;
				}
				const hasSpace = !!attr.spacesAfterEqual.raw;
				const hasLineBreak = /\r?\n/.test(attr.spacesAfterEqual.raw);
				let isBad = false;
				switch (node.rule.value) {
					case 'always': {
						isBad = !hasSpace;
						break;
					}
					case 'never': {
						isBad = hasSpace;
						break;
					}
					case 'always-single-line': {
						// or 'no-newline'
						isBad = !hasSpace || hasLineBreak;
						break;
					}
					case 'never-single-line': {
						isBad = hasSpace && !hasLineBreak;
						break;
					}
				}
				if (isBad) {
					reports.push({
						severity: node.rule.severity,
						message: node.rule.value,
						line: attr.spacesBeforeEqual.startLine,
						col: attr.spacesBeforeEqual.startCol,
						raw: attr.spacesBeforeEqual.raw + attr.equal.raw + attr.spacesAfterEqual.raw,
					});
				}
			}
		});
		return reports;
	},
	async fix(document) {
		await document.walkOn('Element', async node => {
			for (const attr of node.attributes) {
				if (!(attr.equal && attr.spacesAfterEqual && attr.spacesBeforeEqual)) {
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
