import type { Element } from '@markuplint/ml-core';

import { createRule } from '@markuplint/ml-core';

export interface Options {
	'expected-once'?: boolean;
	'in-document-fragment'?: boolean;
}

export default createRule<boolean, Options>({
	defaultOptions: {
		'expected-once': true,
		'in-document-fragment': false,
	},
	async verify({ document, report, globalRule, t }) {
		const h1Stack: Element<boolean, Options>[] = [];

		if (document.nodeList.length === 0) {
			return;
		}

		if (!globalRule.option['in-document-fragment'] && document.isFragment) {
			return;
		}

		await document.walkOn('Element', async node => {
			if (node.nodeName.toLowerCase() === 'h1') {
				h1Stack.push(node);
			}
		});
		if (h1Stack.length === 0) {
			const message = t('Require {0}', t('the "{0}" {1}', 'h1', 'element'));
			report({
				message,
				line: 1,
				col: 1,
				raw: document.nodeList[0].raw.slice(0, 1),
			});
		} else if (globalRule.option['expected-once'] && h1Stack.length > 1) {
			const message = t('{0} is {1:c}', t('the "{0}" {1}', 'h1', 'element'), 'duplicated');
			report({
				message,
				line: h1Stack[1].startLine,
				col: h1Stack[1].startCol,
				raw: h1Stack[1].raw,
			});
		}
	},
});
