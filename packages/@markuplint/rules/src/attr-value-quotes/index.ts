import { createRule } from '@markuplint/ml-core';

export type Type = 'double' | 'single';
export type Quote = '"' | "'";
export type QuoteMap = { [P in Type]: Quote };

const quoteList: QuoteMap = {
	double: '"',
	single: "'",
};

export default createRule<Type>({
	defaultServerity: 'warning',
	defaultValue: 'double',
	verify(context) {
		context.document.walkOn('Element', node => {
			const message = context.translate(
				'{0} is must {1} on {2}',
				'Attribute value',
				'quote',
				`${node.rule.value} quotation mark`,
			);
			for (const attr of node.attributes) {
				if (attr.attrType === 'ps-attr' || attr.isDynamicValue || attr.isDirective || attr.equal.raw === '') {
					continue;
				}
				const quote = attr.startQuote.raw;
				if (quote !== quoteList[node.rule.value]) {
					context.report({
						scope: node,
						message,
						line: attr.name.startLine,
						col: attr.name.startCol,
						raw: attr.raw.trim(),
					});
				}
			}
		});
	},
	fix(context) {
		context.document.walkOn('Element', node => {
			for (const attr of node.attributes) {
				const quote = quoteList[node.rule.value];
				if (attr.attrType === 'html-attr' && quote && attr.startQuote && attr.startQuote.raw !== quote) {
					attr.startQuote.fix(quote);
					attr.endQuote.fix(quote);
				}
			}
		});
	},
});
