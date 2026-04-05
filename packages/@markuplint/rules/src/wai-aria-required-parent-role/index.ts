import type { Options } from '../wai-aria/types.js';

import { createRule, getComputedRole, getSpec } from '@markuplint/ml-core';
import { ARIA_RECOMMENDED_VERSION } from '@markuplint/ml-spec';

import { checkingRequiredAccessibilityParentRole } from '../wai-aria/checkings/required-accessibility-parent-role.js';
import { defaultOptions } from '../wai-aria/default-options.js';
import meta from './meta.js';

/** Warns when an element with an explicit role is placed outside its required parent context. */
export default createRule<boolean, Options>({
	meta,
	defaultOptions,
	async verify({ document, report }) {
		await document.walkOn('Element', el => {
			const roleAttr = el.getAttributeNode('role');
			if (!roleAttr) return;
			const elSpec = getSpec(el, document.specs.specs);
			if (!elSpec) return;
			if (!elSpec.globalAttrs['#ARIAAttrs']) return;
			const ariaVersion =
				el.rule.options?.version ?? document.ruleCommonSettings?.ariaVersion ?? ARIA_RECOMMENDED_VERSION;
			const computed = getComputedRole(document.specs, el, ariaVersion);
			report(checkingRequiredAccessibilityParentRole({ el, computed }));
		});
	},
});
