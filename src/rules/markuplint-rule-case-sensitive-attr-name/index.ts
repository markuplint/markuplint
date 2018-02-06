import { VerifyReturn } from '../../rule';
import CustomRule from '../../rule/custom-rule';
import messages from '../messages';

export type Value = 'no-upper' | 'no-lower';

export default CustomRule.create<Value, null>({
	name: 'case-sensitive-attr-name',
	defaultLevel: 'warning',
	defaultValue: 'no-upper',
	defaultOptions: null,
	async verify (document, locale) {
		const reports: VerifyReturn[] = [];
		await document.walkOn('Element', async (node) => {
			if (!node.rule) {
				return;
			}
			const ms = node.rule.level === 'error' ? 'must' : 'should';
			const deny = node.rule.value === 'no-upper' ? /[A-Z]/ : /[a-z]/;
			const cases = node.rule.value === 'no-upper' ? 'lower' : 'upper';
			const message = await messages(locale, `{0} of {1} ${ms} be {2}`, 'Attribute name', 'HTML', `${cases}case`);
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
