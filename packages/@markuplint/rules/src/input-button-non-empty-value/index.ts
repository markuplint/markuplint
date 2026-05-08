import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

/**
 * `<input type="button">` may omit the `value` attribute (the user
 * agent supplies a default label) but, when specified, the attribute
 * must not be the empty string. This mirrors nu-validator's assertion
 * for the Button state and is the conservative reading of HTML LS
 * (omission allowed; empty-string-when-specified flagged).
 *
 * @see https://html.spec.whatwg.org/multipage/input.html#button-state-(type=button)
 */
export default createRule<boolean, null>({
	meta: meta,
	defaultValue: true,
	defaultOptions: null,
	async verify({ document, report, t }) {
		await document.walkOn('Element', el => {
			if (el.localName !== 'input') return;

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
