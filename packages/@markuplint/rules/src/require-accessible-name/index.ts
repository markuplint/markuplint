import type { ARIAVersion } from '@markuplint/ml-spec';

import { createRule } from '@markuplint/ml-core';

import { getComputedRole } from '../helper/aria/get-computed-role';
import { getRoleSpec } from '../helper/spec/get-role-spec';
import { accnameMayBeMutable } from '../helpers';

type Option = {
	ariaVersion: ARIAVersion;
};

export default createRule<boolean, Option>({
	defaultOptions: {
		ariaVersion: '1.2',
	},
	async verify({ document, report, t }) {
		await document.walkOn('Element', el => {
			if (accnameMayBeMutable(el, document)) {
				return;
			}

			const role = getComputedRole(document.specs, el, el.rule.option.ariaVersion);
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
