import { createRule, getSpec } from '@markuplint/ml-core';

import { checkingNonExistentRole } from '../wai-aria/checkings/non-existent-role.js';
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
			report(checkingNonExistentRole({ attr: roleAttr }));
		});
	},
});
