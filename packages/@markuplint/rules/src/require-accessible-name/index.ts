import type { ARIAVersion } from '@markuplint/ml-spec';

import { createRule, getRoleSpec, getComputedRole } from '@markuplint/ml-core';
import { ARIA_RECOMMENDED_VERSION, isExposed } from '@markuplint/ml-spec';

import { accnameMayBeMutable } from '../helpers.js';

import meta from './meta.js';

export default createRule({
	meta: meta,
	defaultOptions: {
		ariaVersion: undefined as ARIAVersion | undefined,
	},
	async verify({ document, report, t }) {
		await document.walkOn('Element', el => {
			const ariaVersion =
				el.rule.options?.ariaVersion ?? document.ruleCommonSettings?.ariaVersion ?? ARIA_RECOMMENDED_VERSION;

			if (accnameMayBeMutable(el, document)) {
				return;
			}

			if (!isExposed(el, document.specs, ariaVersion)) {
				return;
			}

			const computed = getComputedRole(document.specs, el, ariaVersion);
			if (!computed.role) {
				return;
			}
			const roleSpec = getRoleSpec(document.specs, computed.role.name, el.namespaceURI, ariaVersion);
			if (!roleSpec || !roleSpec.accessibleNameRequired) {
				return;
			}

			const hasAccessibleName = !!el.getAccessibleName(ariaVersion).trim();

			if (!hasAccessibleName) {
				report({ scope: el, message: t('Require {0}', 'accessible name') });
			}
		});
	},
});
