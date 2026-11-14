import type { Options } from '../wai-aria/types.js';

import { createRule, getComputedRole, getSpec } from '@markuplint/ml-core';
import { ARIA_RECOMMENDED_VERSION, getFirstAriaOwnsReferrer } from '@markuplint/ml-spec';

import { checkingRequiredAccessibilityParentRole } from '../wai-aria/checkings/required-accessibility-parent-role.js';
import { defaultOptions } from '../wai-aria/default-options.js';
import meta from './meta.js';

/**
 * The parent is the one of the accessibility tree, with `aria-owns` resolved (`getComputedRole` of
 * `@markuplint/ml-spec`). In a document with a block of template syntax, the element an ID refers to
 * depends on the branch that is rendered, so an element that an `aria-owns` lists is not judged there.
 */
export default createRule<boolean, Options>({
	meta,
	defaultOptions,
	async verify({ document, report }) {
		const isMutable = document.nodeList.some(node => node.is(node.MARKUPLINT_PREPROCESSOR_BLOCK));

		await document.walkOn('Element', el => {
			const roleAttr = el.getAttributeNode('role');
			if (!roleAttr) return;
			const elSpec = getSpec(el, document.specs.specs);
			if (!elSpec) return;
			if (!elSpec.globalAttrs['#ARIAAttrs']) return;
			if (isMutable && getFirstAriaOwnsReferrer(el)) return;
			const ariaVersion =
				el.rule.options?.version ?? document.ruleCommonSettings?.ariaVersion ?? ARIA_RECOMMENDED_VERSION;
			const computed = getComputedRole(document.specs, el, ariaVersion);
			report(checkingRequiredAccessibilityParentRole({ el, computed }));
		});
	},
});
