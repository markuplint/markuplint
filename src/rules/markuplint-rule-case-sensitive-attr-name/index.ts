import {
	CustomRule,
	VerifyReturn,
} from '../../rule';
import messages from '../messages';

export type Value = 'lower' | 'upper';

export default CustomRule.create<Value, null>({
	name: 'case-sensitive-attr-name',
	defaultLevel: 'warning',
	defaultValue: 'lower',
	defaultOptions: null,
	async verify (document, locale) {
		const reports: VerifyReturn[] = [];
		await document.walkOn('Element', async (node) => {
			if (!node.rule) {
				return;
			}
			const ms = node.rule.level === 'error' ? 'must' : 'should';
			const deny = node.rule.value === 'lower' ? /[A-Z]/ : /[a-z]/;
			const message = await messages(locale, `{0} of {1} ${ms} be {2}`, 'Attribute name', 'HTML', `${node.rule.value}case`);
			if (node.namespaceURI === 'http://www.w3.org/1999/xhtml') {
				if (node.attributes) {
					for (const attr of node.attributes) {
						if (deny.test(attr.name)) {
							reports.push({
								level: node.rule.level,
								message,
								line: attr.location.line,
								col: attr.location.col,
								raw: attr.name,
							});
						}
					}
				}
			}
		});
		return reports;
	},
});
