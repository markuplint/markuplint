import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

/**
 * Detects a `<label>` that is not associated with any control: it has no
 * descendant elements at all and no `for` attribute. This is the only check
 * this rule performs — a `<label>` with an excess of descendant controls is
 * `label-no-multiple-controls`'s responsibility, which also accounts for the
 * `for`-references-an-external-control case that this rule does not see.
 */
export default createRule({
	meta: meta,
	defaultSeverity: 'warning',
	async verify({ document, report, t }) {
		await document.walkOn('Element', el => {
			if (el.localName !== 'label') {
				return;
			}

			// If the label is a pretender, the descendants are unknown, so end the verification.
			// However, if the `as` attribute is explicitly specified, the descendant relationship is clear,
			// so verify it as a normal element.
			if (el.pretenderContext?.type === 'pretender' && !el.hasAttribute('as')) {
				return;
			}

			if (el.children.length === 0 && !el.hasAttribute('for')) {
				report({
					scope: el,
					message: t(
						'{0} should associate with {1}',
						t('The "{0*}" {1}', 'label', 'element'),
						t('a {0}', 'control'),
					),
				});
			}
		});
	},
});
