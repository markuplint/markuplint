import type { Options } from '../wai-aria/types.js';

import { createRule, ariaSpecs, getSpec } from '@markuplint/ml-core';
import { ARIA_RECOMMENDED_VERSION, getComputedRole } from '@markuplint/ml-spec';

import { checkingDefaultValue } from '../wai-aria/checkings/default-value.js';
import { defaultOptions } from '../wai-aria/default-options.js';
import { getAriaAttrs, isRoleUnknown } from '../helpers.js';
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
			const propAttrs = getAriaAttrs(el);
			if (propAttrs.length === 0) return;
			const ariaVersion =
				el.rule.options?.version ?? document.ruleCommonSettings?.ariaVersion ?? ARIA_RECOMMENDED_VERSION;
			// A role that is not known until it is rendered gives an implicit value that is not known either
			if (isRoleUnknown(el)) return;
			const { props: propSpecs } = ariaSpecs(document.specs, ariaVersion);
			const role = getComputedRole(document.specs, el, ariaVersion).role?.name ?? null;
			for (const attr of propAttrs) {
				report(checkingDefaultValue({ attr, propSpecs, role }));
			}
		});
	},
});
