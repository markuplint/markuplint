import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

/**
 * Forbid more than one `selected` option in a `<select>` that does not
 * carry the `multiple` attribute. Mirrors HTML LS §4.10.7's "list of
 * options" rule (direct `<option>` children, plus `<option>` children
 * of `<optgroup>` children).
 *
 * @see https://html.spec.whatwg.org/multipage/form-elements.html#the-select-element
 */
export default createRule<boolean, null>({
	meta: meta,
	defaultValue: true,
	defaultOptions: null,
	async verify({ document, report, t }) {
		await document.walkOn('Element', el => {
			if (el.localName !== 'select') return;
			if (el.hasAttribute('multiple')) return;

			const selected = [
				...el.querySelectorAll(':scope > option[selected], :scope > optgroup > option[selected]'),
			];
			if (selected.length <= 1) return;

			for (const opt of selected.slice(1)) {
				report({
					scope: opt,
					message: t(
						'The "{0}" element cannot have more than one selected "{1}" descendant unless the "{2}" attribute is specified',
						'select',
						'option',
						'multiple',
					),
				});
			}
		});
	},
});
