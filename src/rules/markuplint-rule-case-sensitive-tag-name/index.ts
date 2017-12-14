import {
	Document,
	Element,
	EndTagNode,
} from '../../parser';
import Rule, {
	RuleConfig,
	RuleLevel,
	VerifyReturn,
} from '../../rule';
import {
	PermittedContent,
	Ruleset,
} from '../../ruleset';
import messages from '../messages';

export type Value = 'lower' | 'upper';

export default class extends Rule<Value> {
	public name = 'case-sensitive-tag-name';
	public defaultLevel: RuleLevel = 'warning';
	public defaultValue: Value = 'lower';

	public async verify (document: Document, config: RuleConfig<Value>, ruleset: Ruleset, locale: string) {
		const reports: VerifyReturn[] = [];
		const ms = config.level === 'error' ? 'must' : 'should';
		const deny = config.value === 'lower' ? /[A-Z]/ : /[a-z]/;
		const message = await messages(locale, `{0} of {1} ${ms} be {2}`, 'Tag name', 'HTML', `${config.value}case`);
		document.walk((node) => {
			if (
				(node instanceof Element && node.namespaceURI === 'http://www.w3.org/1999/xhtml')
				||
				node instanceof EndTagNode
			) {
				if (deny.test(node.nodeName)) {
					reports.push({
						level: config.level,
						message,
						line: node.line,
						col:
							node instanceof Element
							?
							node.col + 1 // remove "<" char.
							:
							node.col + 2, // remove "</" char.
						raw: node.nodeName,
					});
				}
			}
		});
		return reports;
	}
}
