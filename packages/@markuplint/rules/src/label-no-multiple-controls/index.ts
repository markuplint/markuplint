import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

/**
 * The HTML LS list of form-control descendants that may appear under a
 * `<label>` element. Per the spec only one of these may exist per label.
 *
 * @see https://html.spec.whatwg.org/multipage/forms.html#the-label-element
 */
const FORM_CONTROL_SELECTOR = ['button', 'input', 'meter', 'output', 'progress', 'select', 'textarea'].join(',');

/**
 * Disallow more than one form-control descendant under a `<label>`.
 * Per HTML LS §4.10.4: "The label element may contain at most one
 * descendant button element, input element, meter element, output
 * element, progress element, select element, or textarea element."
 */
export default createRule<boolean, null>({
	meta: meta,
	defaultValue: true,
	defaultOptions: null,
	async verify({ document, report, t }) {
		await document.walkOn('Element', el => {
			if (el.localName !== 'label') return;

			// Pretender labels have unknown descendants until the `as` attribute pins the type.
			if (el.pretenderContext?.type === 'pretender' && !el.hasAttribute('as')) return;

			const controls = [...el.querySelectorAll(FORM_CONTROL_SELECTOR)];
			if (controls.length <= 1) return;

			for (const control of controls.slice(1)) {
				report({
					scope: control,
					message: t(
						'The "{0}" element may contain at most one form-control descendant ({1})',
						'label',
						'button, input, meter, output, progress, select, or textarea',
					),
				});
			}
		});
	},
});
