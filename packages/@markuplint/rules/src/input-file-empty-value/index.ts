import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

/**
 * `<input type="file">` may carry the `value` attribute only when its
 * value is the empty string. Per HTML LS §4.10.5.1.18 (File Upload
 * state): "The value attribute, if specified, must have a value that
 * is the empty string."
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
