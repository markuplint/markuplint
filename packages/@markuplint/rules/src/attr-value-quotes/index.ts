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

/**
 * Rule that enforces consistent quotation marks around attribute values.
 *
 * Verifies that all attribute values use the configured quote style (double
 * or single). Attributes without values, dynamic values, and directives are
 * skipped. Includes an auto-fix that replaces mismatched quotes.
 */
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
