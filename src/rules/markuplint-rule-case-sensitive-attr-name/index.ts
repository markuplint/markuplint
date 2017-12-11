import {
	Document,
	Element,
} from '../../parser';
import Rule, {
	RuleConfig,
	RuleLevel,
	VerifiedResult,
} from '../../rule';
import {
	PermittedContent,
	Ruleset,
} from '../../ruleset';
import messages from '../messages';

export type Value = 'lower' | 'upper';

export default class extends Rule<Value> {
	public name = 'case-sensitive-attr-name';
	public defaultLevel: RuleLevel = 'warning';
	public defaultValue: Value = 'lower';

	public async verify (document: Document, config: RuleConfig<Value>, ruleset: Ruleset, locale: string) {
		const reports: VerifiedResult[] = [];
		const ms = config.level === 'error' ? 'must' : 'should';
		const deny = config.value === 'lower' ? /[A-Z]/ : /[a-z]/;
		const message = await messages(locale, `{0} of {1} ${ms} be {2}`, 'Attribute name', 'HTML', `${config.value}case`);
		document.walk((node) => {
			if (node instanceof Element && node.namespaceURI === 'http://www.w3.org/1999/xhtml') {
				if (node.attributes) {
					for (const attr of node.attributes) {
						if (deny.test(attr.name)) {
							reports.push({
								level: config.level,
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
	}
}
