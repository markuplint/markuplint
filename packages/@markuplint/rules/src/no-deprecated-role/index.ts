import { createRule, getComputedRole, getSpec } from '@markuplint/ml-core';
import { ARIA_RECOMMENDED_VERSION } from '@markuplint/ml-spec';

import { checkingDeprecatedRole } from '../wai-aria/checkings/deprecated-role.js';
import meta from './meta.js';

export default createRule<boolean>({
	meta,
	defaultSeverity: 'warning',
	async verify({ document, report }) {
		await document.walkOn('Element', el => {
			const roleAttr = el.getAttrNode('role');
			if (!roleAttr) return;
			const elSpec = getSpec(el, document.specs.specs);
			if (!elSpec) return;
			if (!elSpec.globalAttrs['#ARIAAttrs']) return;
			const ariaVersion = document.ruleCommonSettings?.ariaVersion ?? ARIA_RECOMMENDED_VERSION;
			const computed = getComputedRole(document.specs, el, ariaVersion);
			report(checkingDeprecatedRole({ attr: roleAttr, role: computed.role }));
		});
	},
});
