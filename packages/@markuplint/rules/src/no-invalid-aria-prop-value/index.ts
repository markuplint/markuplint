import type { Options } from '../wai-aria/types.js';

import { createRule, getComputedRole, ariaSpecs, getSpec } from '@markuplint/ml-core';
import { ARIA_RECOMMENDED_VERSION } from '@markuplint/ml-spec';

import { checkingValue } from '../wai-aria/checkings/value.js';
import { defaultOptions } from '../wai-aria/default-options.js';
import meta from './meta.js';

export default createRule<boolean, Options>({
	meta,
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
				report(checkingValue({ attr, role: computed.role, propSpecs, booleanish: document.booleanish }));
			}
		});
	},
});
