import { VerifyReturn } from '../../rule';
import CustomRule from '../../rule/custom-rule';
import messages from '../messages';

export type Value = 'double' | 'single';

const quote = {
	double: '"',
	single: "'",
};

export default CustomRule.create<Value, null>({
	name: 'attr-value-quotes',
	defaultLevel: 'warning',
	defaultValue: 'double',
	defaultOptions: null,
	async verify (document, locale) {
		const reports: VerifyReturn[] = [];
		await document.walkOn('Element', async (node) => {
			if (!node.rule) {
				return;
			}
			const message = await messages(locale, '{0} is must {1} on {2}', 'Attribute value', 'quote', `${node.rule.value} quotation mark`);
			for (const attr of node.attributes) {
				if (attr.value != null && attr.quote !== quote[node.rule.value]) {
					reports.push({
						level: node.rule.level,
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
});
