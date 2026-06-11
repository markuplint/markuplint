import type { Element } from '@markuplint/ml-core';

import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

/**
 * Configuration options for the required-h1 rule.
 */
export interface Options {
	/** Whether to report a violation when more than one `<h1>` element is found. */
	'expected-once': boolean;
	/** Whether to apply this rule in document fragments (components, partials). */
	'in-document-fragment': boolean;
}

export default createRule<boolean, Options>({
	meta: meta,
	defaultOptions: {
		'expected-once': true,
		'in-document-fragment': false,
	},
	async verify({ document, report, t }) {
		const h1Stack: Element<boolean, Options>[] = [];

		if (document.nodeList.length === 0) {
			return;
		}

		if (!document.rule.options['in-document-fragment'] && document.isFragment) {
			return;
		}

		await document.walkOn('Element', node => {
			if (node.nodeName.toLowerCase() === 'h1') {
				h1Stack.push(node);
			}
		});
		if (h1Stack.length === 0) {
			const message = t('Require {0}', t('the "{0*}" {1}', 'h1', 'element'));
			report({
				message,
				line: 1,
				col: 1,
				raw: document.nodeList[0]?.raw.slice(0, 1) ?? '',
			});
		} else if (document.rule.options['expected-once'] && h1Stack.length > 1 && h1Stack[1]) {
			const message = t('{0} is {1:c}', t('the "{0*}" {1}', 'h1', 'element'), 'duplicated');
			report({
				message,
				line: h1Stack[1].startLine,
				col: h1Stack[1].startCol,
				raw: h1Stack[1].raw,
			});
		}
	},
});
