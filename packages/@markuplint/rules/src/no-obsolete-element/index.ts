import { createRule, getSpec } from '@markuplint/ml-core';

import { isFlagCheckedElement } from '../helpers.js';
import meta from './meta.js';

export default createRule({
	meta: meta,
	async verify({ document, report, t }) {
		await document.walkOn('Element', el => {
			if (!isFlagCheckedElement(el)) {
				return;
			}
			const spec = getSpec(el, document.specs.specs);
			if (spec && spec.obsolete != null) {
				report({
					scope: el,
					message: t('{0} is {1:c}', t('the "{0*}" {1}', el.localName, 'element'), 'obsolete'),
				});
			}
		});
	},
});
