import {
	Document,
	Element,
} from '../../parser';
import Rule, {
	RuleConfig,
	VerifyReturn,
} from '../../rule';
import Ruleset from '../../ruleset';
import messages from '../messages';

export type Value = boolean;

export interface Options {
	'expected-once': boolean;
}

export default class extends Rule<Value, Options> {
	public name = 'required-h1';
	public defaultOptions = { 'expected-once': true };

	public async verify (document: Document<Value, Options>, config: RuleConfig<Value, Options>, ruleset: Ruleset, locale: string) {
		const reports: VerifyReturn[] = [];
		const h1Stack: Element<Value, Options>[] = [];
		document.syncWalk((node) => {
			if (node instanceof Element) {
				if (node.nodeName.toLowerCase() === 'h1') {
					h1Stack.push(node);
				}
			}
		});
		if (h1Stack.length === 0) {
			const message = await messages(locale, 'Missing {0}', 'h1 element');
			reports.push({
				level: config.level,
				message,
				line: 1,
				col: 1,
				raw: document.raw.slice(0, 1),
			});
		} else if (config.option && config.option['expected-once'] && h1Stack.length > 1) {
			const message = await messages(locale, 'Duplicate {0}', 'h1 element');
			reports.push({
				level: config.level,
				message,
				line: h1Stack[1].line,
				col: h1Stack[1].col,
				raw: h1Stack[1].raw,
			});
		}
		return reports;
	}
}
