import { createRule, getSpec } from '@markuplint/ml-core';

import { isFlagCheckedElement } from '../helpers.js';
import meta from './meta.js';

export default createRule({
	meta: meta,
	// Deprecation data is sourced from MDN/BCD (factual, not a spec MUST/MUST
	// NOT), unlike `no-obsolete-element`'s HTML LS non-conforming-features list.
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
