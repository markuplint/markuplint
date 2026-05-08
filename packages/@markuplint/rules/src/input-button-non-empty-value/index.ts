import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

/**
 * Mirror nu-validator's hardcoded assertion that `<input type="button">`
 * must not carry `value=""`. HTML LS itself describes only that the user
 * agent renders the value as the button label (and supplies a default
 * when the attribute is missing); the explicit "non-empty" requirement
 * is from nu-validator's `Assertions.java` (the same schematron-equiv
 * file that drives the Button-state diagnostic). This rule fires only
 * on the explicit empty-string case so spec-permitted omission is
 * preserved.
 *
 * @see https://html.spec.whatwg.org/multipage/input.html#button-state-(type=button)
 * @see https://github.com/validator/validator/blob/main/src/nu/validator/checker/schematronequiv/Assertions.java (search "must have non-empty attribute")
 */
export default createRule<boolean, null>({
	meta: meta,
	defaultValue: true,
	defaultOptions: null,
	async verify({ document, report, t }) {
		await document.walkOn('Element', el => {
			if (el.localName !== 'input') return;
			// Pretender inputs with no `as` pin: attributes are unknown until typed.
			if (el.pretenderContext?.type === 'pretender' && !el.hasAttribute('as')) return;

			const typeAttr = el.getAttributeNode('type');
			const valueAttr = el.getAttributeNode('value');

			if (!typeAttr || !valueAttr) return;
			if (typeAttr.isDynamicValue || valueAttr.isDynamicValue) return;
			if (typeAttr.value.toLowerCase() !== 'button') return;
			if (valueAttr.value !== '') return;

			report({
				scope: valueAttr,
				line: valueAttr.valueNode?.startLine,
				col: valueAttr.valueNode?.startCol,
				raw: valueAttr.valueNode?.raw,
				message: t(
					'The "{0}" attribute on a "{1}" element with "{2}={3}" must not be the empty string',
					'value',
					'input',
					'type',
					'button',
				),
			});
		});
	},
});
