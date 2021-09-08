import { Element, createRule } from '@markuplint/ml-core';

export type Value = boolean;

export interface RequiredH1Options {
	'expected-once': boolean;
	'in-document-fragment': boolean;
}

export default createRule<Value, RequiredH1Options>({
	name: 'required-h1',
	defaultValue: true,
	defaultOptions: {
		'expected-once': true,
		'in-document-fragment': false,
	},
	async verify(context) {
		const h1Stack: Element<Value, RequiredH1Options>[] = [];

		if (context.document.nodeList.length === 0) {
			return;
		}

		if (!context.globalRule.option['in-document-fragment'] && context.document.isFragment) {
			return;
		}

		await context.document.walkOn('Element', async node => {
			if (node.nodeName.toLowerCase() === 'h1') {
				h1Stack.push(node);
			}
		});
		if (h1Stack.length === 0) {
			const message = context.translate('Missing the {0} {1}', 'h1', 'element');
			context.report({
				message,
				line: 1,
				col: 1,
				raw: context.document.nodeList[0].raw.slice(0, 1),
			});
		} else if (context.globalRule.option['expected-once'] && h1Stack.length > 1) {
			const message = context.translate('Duplicate the {0} {1}', 'h1', 'element');
			context.report({
				message,
				line: h1Stack[1].startLine,
				col: h1Stack[1].startCol,
				raw: h1Stack[1].raw,
			});
		}
	},
});
