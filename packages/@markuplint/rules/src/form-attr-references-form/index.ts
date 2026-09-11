import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

/**
 * Form-associated elements (HTML LS §4.10.2). Listed elements may carry
 * a `form` attribute that explicitly associates them with a `<form>`
 * element; the implicit ancestor-based association is otherwise used.
 *
 * @see https://html.spec.whatwg.org/multipage/forms.html#category-listed
 */
const FORM_ASSOCIATED_SELECTOR = [
	'button',
	'fieldset',
	'input',
	'label',
	'meter',
	'object',
	'output',
	'progress',
	'select',
	'textarea',
].join(',');

/**
 * Require the `form` attribute on a form-associated element to reference
 * an actual `<form>` element by ID. Per HTML LS §4.10.18.6: "If
 * specified, the value must be the ID of a form element in the
 * element's tree." Existence of the ID itself is the responsibility of
 * `no-refer-to-non-existent-id`; this rule only checks the element type
 * when the ID resolves.
 *
 * @see https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fae-form
 */
export default createRule<boolean, null>({
	meta: meta,
	defaultValue: true,
	defaultOptions: null,
	async verify({ document, report, t }) {
		await document.walkOn('Element', el => {
			if (!el.matches(FORM_ASSOCIATED_SELECTOR)) return;
			if (el.pretenderContext?.type === 'pretender' && !el.hasAttribute('as')) return;

			const formAttr = el.getAttributeNode('form');
			if (!formAttr) return;
			if (formAttr.isDynamicValue) return;

			const targetId = formAttr.value;
			const target = [...document.querySelectorAll('[id]')].find(
				candidate => candidate.getAttribute('id') === targetId,
			);

			// Existence is checked by `no-refer-to-non-existent-id`. If the ID does not resolve
			// here, leave that diagnostic to the dedicated rule and stay silent.
			if (!target) return;

			if (target.localName !== 'form') {
				report({
					scope: formAttr,
					line: formAttr.valueNode?.startLine,
					col: formAttr.valueNode?.startCol,
					raw: formAttr.valueNode?.raw,
					message: t(
						'The "{0}" attribute on a form-associated element must reference a "{1}" element',
						'form',
						'form',
					),
				});
			}
		});
	},
});
