import type { ARIAVersion } from '@markuplint/ml-spec';

import { createRule, getRoleSpec, getComputedRole } from '@markuplint/ml-core';
import { ARIA_RECOMMENDED_VERSION, isExposed } from '@markuplint/ml-spec';

import { accnameMayBeMutable } from '../helpers.js';

import meta from './meta.js';

type Option = {
	ariaVersion: ARIAVersion;
};

export default createRule<boolean, Option>({
	meta: meta,
	defaultOptions: {
		ariaVersion: ARIA_RECOMMENDED_VERSION,
	},
	async verify({ document, report, t }) {
		await document.walkOn('Element', el => {
			if (accnameMayBeMutable(el, document)) {
				return;
			}

			if (!isExposed(el, document.specs, el.rule.options.ariaVersion)) {
				return;
			}

			const computed = getComputedRole(document.specs, el, el.rule.options.ariaVersion);
			if (!computed.role) {
				return;
			}
			const roleSpec = getRoleSpec(
				document.specs,
				computed.role.name,
				el.namespaceURI,
				el.rule.options.ariaVersion,
			);
			if (!roleSpec || !roleSpec.accessibleNameRequired) {
				return;
			}

			const hasAccessibleName = !!el.getAccessibleName(el.rule.options.ariaVersion).trim();

			if (!hasAccessibleName) {
				report({ scope: el, message: t('Require {0}', 'accessible name') });
			}
		});
	},
});
