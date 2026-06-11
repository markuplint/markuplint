import type { Options } from '../wai-aria/types.js';

import { createRule, ariaSpecs, getAttrSpecs, getSpec } from '@markuplint/ml-core';
import { ARIA_RECOMMENDED_VERSION } from '@markuplint/ml-spec';

import { checkingImplicitProps } from '../wai-aria/checkings/implicit-props.js';
import { defaultOptions } from '../wai-aria/default-options.js';
import meta from './meta.js';

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
				report(checkingImplicitProps({ attr, propSpecs, attrSpecs }));
			}
		});
	},
});
