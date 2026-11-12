import type { TextEdit } from '@markuplint/ml-config';

import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

/** The accepted quote style: double or single. */
export type Type = 'double' | 'single';

/** A literal quotation mark character. */
export type Quote = '"' | "'";

/** Maps each quote style name to its corresponding character. */
export type QuoteMap = { [P in Type]: Quote };

/**
 * Mapping from quote type names to their literal characters.
 */
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
				'{0} must be quoted with {1}',
				'Attribute value',
				attr.rule.value === 'double' ? 'double quotation marks' : 'single quotation marks',
			);
			if (attr.isExpressionValue || attr.isDirective || !attr.equal || attr.equal?.raw === '') {
				return;
			}
			const quote = attr.startQuote?.raw;
			const expectedQuote = quoteList[attr.rule.value];
			if (quote !== expectedQuote) {
				report({
					scope: attr,
					message,
					fix: fixer => {
						const edits: TextEdit[] = [];
						if (attr.startQuote) {
							edits.push(fixer.replaceText(attr.startQuote, expectedQuote));
						}
						if (attr.endQuote) {
							edits.push(fixer.replaceText(attr.endQuote, expectedQuote));
						}
						return edits;
					},
				});
			}
		});
	},
});
