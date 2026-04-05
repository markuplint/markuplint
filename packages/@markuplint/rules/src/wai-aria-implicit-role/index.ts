import type { Options } from '../wai-aria/types.js';

import { createRule, getSpec } from '@markuplint/ml-core';

import { checkingImplicitRole } from '../wai-aria/checkings/implicit-role.js';
import { defaultOptions } from '../wai-aria/default-options.js';
import meta from './meta.js';

/** Warns when the explicit role attribute duplicates the element's implicit role. */
export default createRule<boolean, Options>({
	meta,
	defaultSeverity: 'warning',
	defaultOptions,
	async verify({ document, report }) {
		await document.walkOn('Element', el => {
			const roleAttr = el.getAttributeNode('role');
			if (!roleAttr) return;
			const elSpec = getSpec(el, document.specs.specs);
			if (!elSpec) return;
			if (!elSpec.globalAttrs['#ARIAAttrs']) return;
			report(checkingImplicitRole({ attr: roleAttr }));
		});
	},
});
