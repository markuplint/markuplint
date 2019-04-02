import { Result, createRule } from '@markuplint/ml-core';

export type Type = 'double' | 'single';
export type Quote = '"' | "'";
export type QuoteMap = { [P in Type]: Quote };

const quoteList: QuoteMap = {
	double: '"',
	single: "'",
};

export default createRule<Type>({
	name: 'attr-value-quotes',
	defaultLevel: 'warning',
	defaultValue: 'double',
	defaultOptions: null,
	async verify(document, messages) {
		const reports: Result[] = [];
		await document.walkOn('Element', async node => {
			const message = messages(
				'{0} is must {1} on {2}',
				'Attribute value',
				'quote',
				`${node.rule.value} quotation mark`,
			);
			for (const attr of node.attributes) {
				let quote: string | void;
				if (attr.tokenBeforeValue) {
					quote = attr.tokenBeforeValue.raw;
				} else if (attr.equal) {
					quote = '';
				}
				if (quote != null && quote !== quoteList[node.rule.value]) {
					reports.push({
						severity: node.rule.severity,
						message,
						line: attr.startLine,
						col: attr.startCol,
						raw: attr.raw,
					});
				}
			}
		});
		return reports;
	},
	// async fix(document) {
	// 	await document.walkOn('Element', async node => {
	// 		for (const attr of node.attributes) {
	// 			const quote = quoteList[node.rule.value];
	// 			if (attr.value != null && attr.value.quote !== quote) {
	// 				attr.value.fix(null, quoteList[node.rule.value]);
	// 			}
	// 		}
	// 	});
	// },
});
