import type { Element } from '@markuplint/ml-core';

import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

/**
 * Configuration options for the `require-h1` rule.
 */
export interface Options {
	/** Whether to apply this rule in document fragments (components, partials). */
	'in-document-fragment': boolean;
}

/**
 * Split from the former `required-h1` rule (#3989): the missing-`<h1>` half.
 * Based on WCAG's Techniques H42 for Success Criterion 1.3.1 — a non-normative
 * technique, not the criterion itself, so this rule's default severity is
 * `warning`.
 *
 * @see https://www.w3.org/WAI/WCAG21/Techniques/html/H42
 */
export default createRule<boolean, Options>({
	meta: meta,
	defaultSeverity: 'warning',
	defaultOptions: {
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
		}
	},
});
