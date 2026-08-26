import type { Options } from '../wai-aria/types.js';

import { createRule, ariaSpecs, getAttrSpecs, getSpec } from '@markuplint/ml-core';
import { ARIA_RECOMMENDED_VERSION } from '@markuplint/ml-spec';

import { checkingRedundantAriaProp } from '../wai-aria/checkings/redundant-aria-prop.js';
import { defaultOptions } from '../wai-aria/default-options.js';
import meta from './meta.js';

/**
 * Split from the former `wai-aria-implicit-props` rule (#3989): the
 * "redundant" half. See `checkingRedundantAriaProp`'s JSDoc for the full
 * spec citation. Should-level (ARIA in HTML §6 recommends the native
 * attribute), so this rule keeps the former rule's `warning` default —
 * contrast `no-contradictory-aria-prop`'s `error`.
 */
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
			const { props: propSpecs } = ariaSpecs(document.specs, ariaVersion);
			const attrSpecs = getAttrSpecs(el, document.specs);
			for (const attr of propAttrs) {
				report(checkingRedundantAriaProp({ attr, propSpecs, attrSpecs }));
			}
		});
	},
});
