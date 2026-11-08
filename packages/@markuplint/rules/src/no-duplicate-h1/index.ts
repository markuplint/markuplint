import type { Element } from '@markuplint/ml-core';

import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

/**
 * Configuration options for the `no-duplicate-h1` rule.
 */
export interface Options {
	/** Whether to apply this rule in document fragments (components, partials). */
	'in-document-fragment': boolean;
}

/**
 * Split from the former `required-h1` rule (#3989): the duplicate-`<h1>`
 * half. Based on WCAG's Techniques H42 for Success Criterion 1.3.1 — a
 * non-normative technique, not the criterion itself, so this rule's default
 * severity is `warning`. The former rule's `expected-once` option gated this
 * check; disabling this rule entirely is how to opt out now.
 *
 * @see https://www.w3.org/WAI/WCAG22/Techniques/html/H42
 */
export default createRule<boolean, Options>({
	meta: meta,
	defaultSeverity: 'warning',
	defaultOptions: {
		'in-document-fragment': false,
	},
	verify({ document, report, t }) {
		if (document.nodeList.length === 0) {
			return;
		}

		if (!document.rule.options['in-document-fragment'] && document.isFragment) {
			return;
		}

		// The h1 elements are counted by tree: the content of a `template` element and a declarative
		// shadow root are trees of their own, where it is not known from the markup where they are inserted
		const h1sOfTree = new Map<object, Element<boolean, Options>[]>();
		for (const h1 of document.deepQuerySelectorAll('h1')) {
			const root = h1.getRootNode();
			h1sOfTree.set(root, [...(h1sOfTree.get(root) ?? []), h1]);
		}
		for (const h1Stack of h1sOfTree.values()) {
			const duplicated = h1Stack[1];
			if (duplicated) {
				const message = t('{0} is {1:c}', t('the "{0*}" {1}', 'h1', 'element'), 'duplicated');
				report({
					message,
					line: duplicated.startLine,
					col: duplicated.startCol,
					raw: duplicated.raw,
				});
			}
		}
	},
});
