import { createRule, getSpec } from '@markuplint/ml-core';

import { checkingPermittedRoles } from '../wai-aria/checkings/permitted-roles.js';
import { isRoleUnknown } from '../helpers.js';
import meta from './meta.js';

export default createRule<boolean>({
	meta,
	async verify({ document, report }) {
		await document.walkOn('Element', el => {
			const roleAttr = el.getAttrNode('role');
			if (!roleAttr) return;
			// The tokens of a value that code gives, or of one that a spread attribute after it may override,
			// are not the roles that the element has when it is rendered
			if (isRoleUnknown(el)) return;
			const elSpec = getSpec(el, document.specs.specs);
			if (!elSpec) return;
			if (!elSpec.globalAttrs['#ARIAAttrs']) return;
			report(checkingPermittedRoles({ attr: roleAttr }));
		});
	},
});
