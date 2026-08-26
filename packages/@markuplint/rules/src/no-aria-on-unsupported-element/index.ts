import { createRule, getSpec } from '@markuplint/ml-core';

import { Collection } from '../helpers.js';
import meta from './meta.js';

/**
 * Extracted from the former `wai-aria` umbrella rule (#3989), which always
 * performed this check first, unconditionally, before any of its other
 * (now independently-split) checks. No element in the bundled HTML / SVG /
 * MathML spec data currently sets `globalAttrs['#ARIAAttrs']` to `false` —
 * every element that declares the flag at all sets it `true` — so this rule
 * has no reachable positive case against the current spec data; it exists
 * to remain correct if a future spec update marks some element this way.
 */
export default createRule({
	meta: meta,
	async verify({ document, report, t }) {
		await document.walkOn('Element', el => {
			const elSpec = getSpec(el, document.specs.specs);
			if (!elSpec) {
				return;
			}
			if (elSpec.globalAttrs['#ARIAAttrs']) {
				return;
			}

			const roleAttr = el.getAttributeNode('role');
			const propAttrs = el.attributes.filter(attr => /^aria-/i.test(attr.name));
			const ariaAttrs = new Collection(roleAttr, ...propAttrs);

			for (const ariaAttr of ariaAttrs) {
				report({
					scope: ariaAttr,
					message: t('{0} is {1:c}', t('the "{0*}" {1}', ariaAttr.name, 'attribute'), 'disallowed'),
				});
			}
		});
	},
});
