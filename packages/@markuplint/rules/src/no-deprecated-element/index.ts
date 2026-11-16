import { createRule, getSpec } from '@markuplint/ml-core';

import { isFlagCheckedElement } from '../helpers.js';
import meta from './meta.js';

export default createRule({
	meta: meta,
	// Deprecation is what a specification calls deprecated or what browser vendors deprecate
	// (BCD): factual, not a spec MUST/MUST NOT, unlike the HTML LS non-conforming
	// features that `no-obsolete-element` follows.
	defaultSeverity: 'warning',
	async verify({ document, report, t }) {
		await document.walkOn('Element', el => {
			if (!isFlagCheckedElement(el)) {
				return;
			}
			const spec = getSpec(el, document.specs.specs);
			if (spec && spec.deprecated) {
				report({
					scope: el,
					message: t('{0} is {1:c}', t('the "{0*}" {1}', el.localName, 'element'), 'deprecated'),
				});
			}
		});
	},
});
