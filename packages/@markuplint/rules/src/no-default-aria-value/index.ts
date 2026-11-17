import { createRule, ariaSpecs, getSpec } from '@markuplint/ml-core';
import { ARIA_RECOMMENDED_VERSION } from '@markuplint/ml-spec';

import { checkingDefaultValue } from '../wai-aria/checkings/default-value.js';
import { getAriaAttrs } from '../helpers.js';
import meta from './meta.js';

export default createRule<boolean>({
	meta,
	defaultSeverity: 'warning',
	async verify({ document, report }) {
		await document.walkOn('Element', el => {
			const elSpec = getSpec(el, document.specs.specs);
			if (!elSpec) return;
			if (!elSpec.globalAttrs['#ARIAAttrs']) return;
			const propAttrs = getAriaAttrs(el);
			if (propAttrs.length === 0) return;
			const ariaVersion = document.ruleCommonSettings?.ariaVersion ?? ARIA_RECOMMENDED_VERSION;
			const { props: propSpecs } = ariaSpecs(document.specs, ariaVersion);
			for (const attr of propAttrs) {
				report(checkingDefaultValue({ attr, propSpecs }));
			}
		});
	},
});
