import { ariaSpecs, createRule, getComputedRole, getSpec } from '@markuplint/ml-core';
import { ARIA_RECOMMENDED_VERSION } from '@markuplint/ml-spec';

import { checkingRequiredProp } from '../wai-aria/checkings/required-prop.js';
import meta from './meta.js';

export default createRule<boolean>({
	meta,
	async verify({ document, report }) {
		await document.walkOn('Element', el => {
			const roleAttr = el.getAttrNode('role');
			if (!roleAttr) return;
			const elSpec = getSpec(el, document.specs.specs);
			if (!elSpec) return;
			if (!elSpec.globalAttrs['#ARIAAttrs']) return;
			const ariaVersion = document.ruleCommonSettings?.ariaVersion ?? ARIA_RECOMMENDED_VERSION;
			const computed = getComputedRole(document.specs, el, ariaVersion);
			const { props: propSpecs } = ariaSpecs(document.specs, ariaVersion);
			report(checkingRequiredProp({ el, role: computed.role, propSpecs }));
		});
	},
});
