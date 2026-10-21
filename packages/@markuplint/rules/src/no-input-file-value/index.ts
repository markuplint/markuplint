import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

/**
 * Reports a non-empty `value` attribute on `<input type="file">`.
 *
 * Superseded by `no-disallowed-attr`: HTML LS §4.10.5.1.17 (File Upload
 * state) does not allow the attribute at all, an empty one included.
 * This rule was written against a sentence that is not in the spec
 * (that the attribute, if specified, must have a value that is the empty
 * string) and so lets `value=""` through. Its behavior is kept for configurations that
 * name it; it is removed in v6.
 *
 * > The element's value attribute must be omitted.
 *
 * @see https://html.spec.whatwg.org/multipage/input.html#file-upload-state-(type=file)
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
			if (typeAttr.value.toLowerCase() !== 'file') return;
			if (valueAttr.value === '') return;

			report({
				scope: valueAttr,
				line: valueAttr.valueNode?.startLine,
				col: valueAttr.valueNode?.startCol,
				raw: valueAttr.valueNode?.raw,
				message: t(
					'The "{0}" attribute on a "{1}" element with "{2}={3}" must be the empty string',
					'value',
					'input',
					'type',
					'file',
				),
			});
		});
	},
});
