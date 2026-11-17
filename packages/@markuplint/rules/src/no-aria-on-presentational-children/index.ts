import { createRule, getSpec } from '@markuplint/ml-core';

import { checkingPresentationalChildren } from '../wai-aria/checkings/presentational-children.js';
import meta from './meta.js';

export default createRule<boolean>({
	meta,
	defaultSeverity: 'warning',
	async verify({ document, report }) {
		await document.walkOn('Element', el => {
			const elSpec = getSpec(el, document.specs.specs);
			if (!elSpec) return;
			if (!elSpec.globalAttrs['#ARIAAttrs']) return;
			for (const attr of el.attributes) {
				// An attribute that the framework does not output is not an attribute of the element
				if (attr.isAbsent) {
					continue;
				}
				report(checkingPresentationalChildren({ attr, el }));
			}
		});
	},
});
