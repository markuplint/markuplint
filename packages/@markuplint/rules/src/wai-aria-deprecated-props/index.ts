import type { Options } from '../wai-aria/types.js';

import { createRule, getComputedRole, ariaSpecs, getSpec } from '@markuplint/ml-core';
import { ARIA_RECOMMENDED_VERSION } from '@markuplint/ml-spec';

import { checkingDeprecatedProps } from '../wai-aria/checkings/deprecated-props.js';
import { defaultOptions } from '../wai-aria/default-options.js';
import meta from './meta.js';

/** Warns when a deprecated ARIA property or state is used on a role. */
export default createRule<boolean, Options>({
	meta,
	defaultSeverity: 'warning',
	defaultOptions,
	async verify({ document, report }) {
		await document.walkOn('Element', el => {
			const elSpec = getSpec(el, document.specs.specs);
			if (!elSpec) return;
			if (!elSpec.globalAttrs['#ARIAAttrs']) return;
			const propAttrs = el.attributes.filter(attr => /^aria-/i.test(attr.name));
			if (propAttrs.length === 0) return;
			const ariaVersion =
				el.rule.options?.version ?? document.ruleCommonSettings?.ariaVersion ?? ARIA_RECOMMENDED_VERSION;
			const computed = getComputedRole(document.specs, el, ariaVersion);
			const { props: propSpecs } = ariaSpecs(document.specs, ariaVersion);
			for (const attr of propAttrs) {
				report(checkingDeprecatedProps({ attr, role: computed.role, propSpecs }));
			}
		});
	},
});
