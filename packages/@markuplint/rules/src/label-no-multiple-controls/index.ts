import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

/**
 * The HTML LS list of form-control descendants that may appear under a
 * `<label>` element. Per the spec only one of these may exist per label,
 * and only when the label is not already bound to an external labeled
 * control via `for`.
 *
 * @see https://html.spec.whatwg.org/multipage/forms.html#the-label-element
 */
const FORM_CONTROL_SELECTOR = ['button', 'input', 'meter', 'output', 'progress', 'select', 'textarea'].join(',');

/**
 * Labelable elements per HTML LS §4.10.2 *Categories: Labelable elements*.
 * The set matches `label-for-references-labelable`; kept in sync to
 * classify the target of `for` consistently across both rules.
 *
 * @see https://html.spec.whatwg.org/multipage/forms.html#category-label
 */
const LABELABLE_SELECTOR = [
	'button',
	'input:not([type="hidden" i])',
	'meter',
	'output',
	'progress',
	'select',
	'textarea',
].join(',');

/**
 * Enforce the descendant-control constraints on a `<label>` element.
 *
 * Per HTML LS §4.10.4 content model: "Phrasing content, but with no
 * descendant labelable elements unless it is the element's labeled
 * control, and no descendant label elements." The labeled control is
 * either the element whose ID equals the `for` attribute (when set to
 * a labelable element in the same tree) or the first labelable
 * descendant in tree order.
 *
 * Two branches follow from that definition:
 *
 * - `for` resolves to an external labelable element → no descendant
 *   form control may appear inside the label (the labeled control is
 *   outside).
 * - Otherwise → at most one descendant form control; the first in tree
 *   order is the labeled control, any subsequent ones are excess.
 *
 * ID existence itself is delegated to `no-refer-to-non-existent-id`;
 * `for` referencing a non-labelable element is delegated to
 * `label-for-references-labelable`. This rule only inspects the label
 * subtree once the target's category has been classified.
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
			if (controls.length === 0) return;

			const forAttr = el.getAttributeNode('for');
			const hasExternalLabeledControl = (() => {
				if (!forAttr || forAttr.isDynamicValue) return false;
				const target = [...document.querySelectorAll('[id]')].find(
					candidate => candidate.getAttribute('id') === forAttr.value,
				);
				if (!target) return false;
				// A descendant with a matching id is still the label's labeled control
				// per the same-tree resolution rule; treat only truly external targets
				// as the external-labeled-control case.
				if (el.contains(target)) return false;
				return target.matches(LABELABLE_SELECTOR);
			})();

			if (hasExternalLabeledControl) {
				for (const control of controls) {
					report({
						scope: control,
						message: t(
							'The "{0}" element must not contain a form-control descendant when the "{1}" attribute references an external labelable element',
							'label',
							'for',
						),
					});
				}
				return;
			}

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
