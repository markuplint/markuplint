import { VerifyReturn } from '../../rule';
import CustomRule from '../../rule/custom-rule';

export type Type = 'double' | 'single';
export type Quote = '"' | "'";
export type QuoteMap = {[P in Type]: Quote };

const quoteList: QuoteMap = {
	double: '"',
	single: "'",
};

export default CustomRule.create<Type, null>({
	name: 'attr-value-quotes',
	defaultLevel: 'warning',
	defaultValue: 'double',
	defaultOptions: null,
	async verify (document, messages) {
		const reports: VerifyReturn[] = [];
		document.syncWalkOn('Element', (node) => {
			const message = messages('{0} is must {1} on {2}', 'Attribute value', 'quote', `${node.rule.value} quotation mark`);
			for (const attr of node.attributes) {
				if (attr.value != null && attr.value.quote !== quoteList[node.rule.value]) {
					reports.push({
						severity: node.rule.severity,
						message,
						line: attr.location.line,
						col: attr.location.col,
						raw: attr.raw,
					});
				}
			}
		});
		return reports;
	},
	async fix (document) {
		document.syncWalkOn('Element', (node) => {
			for (const attr of node.attributes) {
				const quote = quoteList[node.rule.value];
				if (attr.value != null && attr.value.quote !== quote) {
					attr.value.fix(null, quoteList[node.rule.value]);
				}
			}
		});
	},
});
