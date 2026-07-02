import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

const DEFAULT_MAX = 1;

function parseFloatAttr(raw: string | undefined): number | null {
	if (raw === undefined) return null;
	const trimmed = raw.trim();
	if (trimmed === '') return null;
	const n = Number(trimmed);
	return Number.isFinite(n) ? n : null;
}

/**
 * Enforce HTML LS §4.10.14 inequalities for `<progress>`:
 * `value ≤ max` when both attributes are present, and `value ≤ 1` when
 * `max` is absent. Authored-but-unparsable values, out-of-range `max`
 * (≤ 0), and negative `value` are deferred to `invalid-attr`.
 *
 * @see https://html.spec.whatwg.org/multipage/form-elements.html#the-progress-element
 */
export default createRule<boolean, null>({
	meta: meta,
	defaultValue: true,
	defaultOptions: null,
	async verify({ document, report, t }) {
		await document.walkOn('Element', el => {
			if (el.localName !== 'progress') return;
			if (el.pretenderContext?.type === 'pretender' && !el.hasAttribute('as')) return;

			const valueAttr = el.getAttributeNode('value');
			const maxAttr = el.getAttributeNode('max');

			if (valueAttr === null) return;
			if (valueAttr.isDynamicValue || maxAttr?.isDynamicValue) return;

			const valueNum = parseFloatAttr(valueAttr.value);
			const maxNum = parseFloatAttr(maxAttr?.value);

			if (valueNum === null) return;
			if (maxAttr && maxNum === null) return;

			const maxValue = maxNum ?? DEFAULT_MAX;

			if (valueNum <= maxValue) return;

			const message = maxAttr
				? t(
						'The value of the "{0}" attribute must be less than or equal to {1}',
						'value',
						t('the value of the "{0}" attribute', 'max'),
					)
				: t(
						'The value of the "{0}" attribute must be less than or equal to {1}',
						'value',
						t('{0} when the "{1}" attribute is absent', 'one', 'max'),
					);

			report({
				scope: valueAttr,
				line: valueAttr.valueNode?.startLine,
				col: valueAttr.valueNode?.startCol,
				raw: valueAttr.valueNode?.raw,
				message: message,
			});
		});
	},
});
