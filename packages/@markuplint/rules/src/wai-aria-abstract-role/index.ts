import type { Options } from '../wai-aria/types.js';

import { createRule, getSpec } from '@markuplint/ml-core';

import { checkingAbstractRole } from '../wai-aria/checkings/abstract-role.js';
import { defaultOptions } from '../wai-aria/default-options.js';
import meta from './meta.js';

/** Warns when an abstract WAI-ARIA role is used directly in content. */
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
			report(checkingAbstractRole({ attr: roleAttr }));
		});
	},
});
