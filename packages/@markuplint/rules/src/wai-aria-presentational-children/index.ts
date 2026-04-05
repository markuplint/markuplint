import type { Options } from '../wai-aria/types.js';

import { createRule, getSpec } from '@markuplint/ml-core';

import { checkingPresentationalChildren } from '../wai-aria/checkings/presentational-children.js';
import { defaultOptions } from '../wai-aria/default-options.js';
import meta from './meta.js';

/** Warns when ARIA attributes are set on descendants of roles with presentational children. */
export default createRule<boolean, Options>({
	meta,
	defaultSeverity: 'warning',
	defaultOptions,
	async verify({ document, report }) {
		await document.walkOn('Element', el => {
			const elSpec = getSpec(el, document.specs.specs);
			if (!elSpec) return;
			if (!elSpec.globalAttrs['#ARIAAttrs']) return;
			report(checkingPresentationalChildren({ el }));
		});
	},
});
