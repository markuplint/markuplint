import type { Options } from '../wai-aria/types.js';

import { createRule } from '@markuplint/ml-core';

import { defaultOptions } from '../wai-aria/default-options.js';
import meta from './meta.js';

/**
 * ARIA in HTML §"Rules of ARIA attribute usage by HTML feature", the `hidden` row:
 * "authors MUST NOT use `aria-hidden="true"` on any element which also has the
 * `hidden` attribute specified in the Hidden Until Found state." Content revealed
 * by the browser's find-in-page feature would otherwise stay excluded from the
 * accessibility tree, silently breaking that reveal for assistive technology users.
 *
 * @see https://w3c.github.io/html-aria/#att-hidden
 */
export default createRule<boolean, Options>({
	meta,
	defaultSeverity: 'error',
	defaultOptions,
	async verify({ document, report, t }) {
		await document.walkOn('Element', el => {
			const ariaHidden = el.getAttributeNode('aria-hidden');
			if (!ariaHidden || ariaHidden.isDynamicValue) {
				return;
			}
			if (ariaHidden.value.trim().toLowerCase() !== 'true') {
				return;
			}
			if (el.getAttribute('hidden')?.trim().toLowerCase() !== 'until-found') {
				return;
			}
			report({
				scope: ariaHidden,
				message: t(
					'"aria-hidden" must not be "{0}" on an element with "hidden" value "{1}"',
					'true',
					'until-found',
				),
			});
		});
	},
});
