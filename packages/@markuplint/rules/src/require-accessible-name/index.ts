import { createRule } from '@markuplint/ml-core';

import { accnameMayBeMutable, getComputedRole, getRoleSpec } from '../helpers';

export default createRule<boolean, null>({
	async verify({ document, report, t }) {
		await document.walkOn('Element', el => {
			if (accnameMayBeMutable(el, document)) {
				return;
			}

			const role = getComputedRole(document.specs, el);
			if (!role) {
				return;
			}
			const roleSpec = getRoleSpec(document.specs, role.name);
			if (!roleSpec || !roleSpec.accessibleNameRequired) {
				return;
			}

			const hasAccessibleName = !!el.getAccessibleName().trim();

			if (!hasAccessibleName) {
				report({ scope: el, message: t('Require {0}', 'accessible name') });
			}
		});
	},
});
