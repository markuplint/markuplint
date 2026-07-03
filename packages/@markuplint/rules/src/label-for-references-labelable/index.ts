import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

/**
 * Labelable elements per HTML LS §4.10.2 *Categories: Labelable elements*.
 * `<input>` is labelable except when its `type` is in the Hidden state; the
 * `:not([type="hidden" i])` clause matches the spec exclusion ASCII
 * case-insensitively.
 *
 * Known limitation: form-associated custom elements (HTML LS §4.13.5.9) are
 * also labelable, but detecting this requires runtime `ElementInternals`
 * inspection which is unavailable at parse time. This selector treats
 * custom elements as non-labelable — same as `form-attr-references-form`
 * and `input-list-references-datalist`.
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
 * Require the `for` attribute on a `<label>` element to reference an
 * actual labelable element by ID. Per HTML LS §4.10.4: "If the attribute
 * is specified, the attribute's value must be the ID of a labelable
 * element in the same tree as the label element." Existence of the ID
 * itself is the responsibility of `no-refer-to-non-existent-id`; this
 * rule only checks the element type when the ID resolves.
 *
 * @see https://html.spec.whatwg.org/multipage/forms.html#attr-label-for
 */
export default createRule<boolean, null>({
	meta: meta,
	defaultValue: true,
	defaultOptions: null,
	async verify({ document, report, t }) {
		await document.walkOn('Element', el => {
			if (el.localName !== 'label') return;
			if (el.pretenderContext?.type === 'pretender' && !el.hasAttribute('as')) return;

			const forAttr = el.getAttributeNode('for');
			if (!forAttr) return;
			if (forAttr.isDynamicValue) return;

			const targetId = forAttr.value;
			const target = [...document.querySelectorAll('[id]')].find(
				candidate => candidate.getAttribute('id') === targetId,
			);

			// Existence is checked by `no-refer-to-non-existent-id`. If the ID does not resolve
			// here, leave that diagnostic to the dedicated rule and stay silent.
			if (!target) return;

			if (!target.matches(LABELABLE_SELECTOR)) {
				report({
					scope: forAttr,
					line: forAttr.valueNode?.startLine,
					col: forAttr.valueNode?.startCol,
					raw: forAttr.valueNode?.raw,
					message: t(
						'The "{0}" attribute of the "{1}" element must reference a labelable element',
						'for',
						'label',
					),
				});
			}
		});
	},
});
