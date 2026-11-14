import type { Options } from '../wai-aria/types.js';

import { createRule, getComputedRole, getSpec } from '@markuplint/ml-core';
import { ARIA_RECOMMENDED_VERSION } from '@markuplint/ml-spec';

import { defaultOptions } from '../wai-aria/default-options.js';
import meta from './meta.js';

/**
 * WAI-ARIA 1.3, Children Presentational:
 *
 * > Authors MUST NOT specify aria-owns on an element which has Presentational Children.
 *
 * The role is the computed role of the element, so an implicit role with presentational children
 * (`<button>`, `<img>`) counts as an explicit one does. The rule reports under every ARIA version,
 * although WAI-ARIA 1.1 and 1.2 do not state the requirement; the version decides the roles.
 *
 * @see https://w3c.github.io/aria/#childrenArePresentational
 */
export default createRule<boolean, Options>({
	meta,
	defaultSeverity: 'error',
	defaultOptions,
	async verify({ document, report, t }) {
		await document.walkOn('Element', el => {
			const attr = el.getAttributeNode('aria-owns');
			if (!attr || attr.isAbsent) {
				return;
			}
			if (!getSpec(el, document.specs.specs)?.globalAttrs['#ARIAAttrs']) {
				return;
			}
			const ariaVersion =
				el.rule.options?.version ?? document.ruleCommonSettings?.ariaVersion ?? ARIA_RECOMMENDED_VERSION;
			const role = getComputedRole(document.specs, el, ariaVersion).role;
			if (!role?.childrenPresentational) {
				return;
			}
			report({
				scope: attr,
				message: t(
					'"aria-owns" must not be specified on an element with the "{0*}" role, whose children are presentational',
					role.name,
				),
			});
		});
	},
});
