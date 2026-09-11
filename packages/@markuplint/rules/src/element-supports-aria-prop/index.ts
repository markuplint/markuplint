import type { Options } from '../wai-aria/types.js';

import { createRule, getComputedRole, ariaSpecs, getSpec } from '@markuplint/ml-core';
import { ARIA_RECOMMENDED_VERSION } from '@markuplint/ml-spec';

import { checkingElementSupportsAriaProp } from '../wai-aria/checkings/element-supports-aria-prop.js';
import { defaultOptions } from '../wai-aria/default-options.js';
import meta from './meta.js';

/**
 * Split from the former `wai-aria-disallowed-props` rule (#3989): the ARIA in
 * HTML element-specific `aria-*` restrictions alone. See
 * `checkingElementSupportsAriaProp`'s JSDoc for the full spec citation.
 *
 * The former rule's `disallowSetImplicitProps` option gated this check; the
 * split rule has no such option — disabling this rule entirely is how users
 * opt out.
 */
export default createRule<boolean, Options>({
	meta,
	defaultOptions,
	async verify({ document, report }) {
		await document.walkOn('Element', el => {
			const elSpec = getSpec(el, document.specs.specs);
			// Autonomous custom elements have no spec.<el>.jsonc entry and no
			// element-specific restriction to enforce here.
			if (!elSpec) return;
			if (!elSpec.globalAttrs['#ARIAAttrs']) return;
			const propAttrs = el.attributes.filter(attr => /^aria-/i.test(attr.name));
			if (propAttrs.length === 0) return;
			const ariaVersion =
				el.rule.options?.version ?? document.ruleCommonSettings?.ariaVersion ?? ARIA_RECOMMENDED_VERSION;
			const computed = getComputedRole(document.specs, el, ariaVersion);
			const { props: propSpecs } = ariaSpecs(document.specs, ariaVersion);
			for (const attr of propAttrs) {
				report(checkingElementSupportsAriaProp({ attr, role: computed.role, propSpecs }));
			}
		});
	},
});
