import type { Options } from '../wai-aria/types.js';

import { createRule, getComputedRole, ariaSpecs, getSpec } from '@markuplint/ml-core';
import { ARIA_RECOMMENDED_VERSION } from '@markuplint/ml-spec';

import { checkingRoleSupportsAriaProp } from '../wai-aria/checkings/role-supports-aria-prop.js';
import { defaultOptions } from '../wai-aria/default-options.js';
import meta from './meta.js';

/**
 * Split from the former `wai-aria-disallowed-props` rule (#3989): the
 * role-derived "supported states and properties" check alone. See
 * `checkingRoleSupportsAriaProp`'s JSDoc for the full spec citation.
 */
export default createRule<boolean, Options>({
	meta,
	defaultOptions,
	async verify({ document, report }) {
		await document.walkOn('Element', el => {
			const elSpec = getSpec(el, document.specs.specs);
			// Autonomous custom elements have no spec.<el>.jsonc entry and no
			// computed role for this checker to key on.
			if (!elSpec && el.elementType !== 'web-component') return;
			if (elSpec && !elSpec.globalAttrs['#ARIAAttrs']) return;
			const propAttrs = el.attributes.filter(attr => /^aria-/i.test(attr.name));
			if (propAttrs.length === 0) return;
			const ariaVersion =
				el.rule.options?.version ?? document.ruleCommonSettings?.ariaVersion ?? ARIA_RECOMMENDED_VERSION;
			const computed = getComputedRole(document.specs, el, ariaVersion);
			const { props: propSpecs } = ariaSpecs(document.specs, ariaVersion);
			for (const attr of propAttrs) {
				report(checkingRoleSupportsAriaProp({ attr, role: computed.role, propSpecs }));
			}
		});
	},
});
