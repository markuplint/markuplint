import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

export type Type = 'double' | 'single';
export type Quote = '"' | "'";
export type QuoteMap = { [P in Type]: Quote };

const quoteList: QuoteMap = {
	double: '"',
	single: "'",
};

export default createRule<Type>({
	meta: meta,
	defaultSeverity: 'warning',
	defaultValue: 'double',
	async verify({ document, report, t }) {
		await document.walkOn('Attr', attr => {
			const message = t(
				'{0} is must {1} on {2}',
				'Attribute value',
				'quote',
				`${attr.rule.value} quotation mark`,
			);
			if (attr.isDynamicValue || attr.isDirective || !attr.equal || attr.equal?.raw === '') {
				return;
			}
			const quote = attr.startQuote?.raw;
			if (quote !== quoteList[attr.rule.value]) {
				report({
					scope: attr,
					message,
				});
			}
		});
	},
	async fix({ document }) {
		await document.walkOn('Attr', attr => {
			const quote = quoteList[attr.rule.value];
			if (quote && attr.startQuote && attr.startQuote.raw !== quote) {
				attr.startQuote.fix(quote);
				attr.endQuote?.fix(quote);
			}
		});
	},
});
