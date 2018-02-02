import Element from '../../dom/element';

import { VerifyReturn } from '../../rule';
import CustomRule from '../../rule/custom-rule';
import messages from '../messages';

export type Value = boolean;

export interface Options {
	'expected-once': boolean;
}

export default CustomRule.create<Value, Options>({
	name: 'required-h1',
	defaultValue: true,
	defaultOptions: { 'expected-once': true },
	async verify (document, locale) {
		// @ts-ignore TODO
		const config = document.ruleConfig || {};
		const reports: VerifyReturn[] = [];
		const h1Stack: Element<Value, Options>[] = [];
		document.syncWalkOn('Element', (node) => {
			if (node.nodeName.toLowerCase() === 'h1') {
				h1Stack.push(node);
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
	},
});
