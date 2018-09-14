import { createRule, Element, Result } from '@markuplint/ml-core';

export type Value = boolean;

export interface RequiredH1Options {
	'expected-once': boolean;
}

export default createRule<Value, RequiredH1Options>({
	name: 'required-h1',
	defaultValue: true,
	defaultOptions: {
		'expected-once': true,
	},
	async verify(document, messages) {
		// @ts-ignore TODO
		const config = document.ruleConfig || {};
		const reports: Result[] = [];
		const h1Stack: Element<Value, RequiredH1Options>[] = [];
		await document.walkOn('Element', async node => {
			if (node.nodeName.toLowerCase() === 'h1') {
				h1Stack.push(node);
			}
		});
		if (h1Stack.length === 0) {
			const message = messages('Missing {0}', 'h1 element');
			reports.push({
				severity: config.level,
				message,
				line: 1,
				col: 1,
				raw: document.raw.slice(0, 1),
			});
		} else if (config.option['expected-once'] && h1Stack.length > 1) {
			const message = messages('Duplicate {0}', 'h1 element');
			reports.push({
				severity: config.level,
				message,
				line: h1Stack[1].startLine,
				col: h1Stack[1].startCol,
				raw: h1Stack[1].raw,
			});
		}
		return reports;
	},
});
