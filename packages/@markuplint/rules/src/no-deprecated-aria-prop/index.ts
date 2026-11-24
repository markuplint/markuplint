import { createRule, getComputedRole, ariaSpecs, getSpec } from '@markuplint/ml-core';
import { ARIA_RECOMMENDED_VERSION } from '@markuplint/ml-spec';

import { checkingDeprecatedProps } from '../wai-aria/checkings/deprecated-props.js';
import { getAriaAttrs, isRoleUnknown } from '../helpers.js';
import meta from './meta.js';

export default createRule<boolean>({
	meta,
	defaultSeverity: 'warning',
	async verify({ document, report }) {
		await document.walkOn('Element', el => {
			const elSpec = getSpec(el, document.specs.specs);
			if (!elSpec) return;
			if (!elSpec.globalAttrs['#ARIAAttrs']) return;
			const propAttrs = getAriaAttrs(el);
			if (propAttrs.length === 0) return;
			// What the role deprecates is not known where the role is not known until it is rendered. The
			// checker reads only the role's `ownedProperties`, and no property is deprecated on every role
			// in the ARIA data of any version (`aria-disabled`, `aria-errormessage`, `aria-haspopup` and
			// `aria-invalid` are deprecated on some roles and not on others), so "deprecated on every role
			// that could apply" never holds and skipping the element loses no report. The spec of this rule
			// that asserts the data ("no ARIA property is deprecated on every role") fails when that changes.
			if (isRoleUnknown(el)) return;
			const ariaVersion = document.ruleCommonSettings?.ariaVersion ?? ARIA_RECOMMENDED_VERSION;
			const computed = getComputedRole(document.specs, el, ariaVersion);
			const { props: propSpecs } = ariaSpecs(document.specs, ariaVersion);
			for (const attr of propAttrs) {
				report(checkingDeprecatedProps({ attr, role: computed.role, propSpecs }));
			}
		});
	},
});
