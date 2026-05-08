import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

const DEFAULT_MIN = 0;
const DEFAULT_MAX = 1;

function parseFloatAttr(raw: string | undefined): number | null {
	if (raw === undefined) return null;
	const trimmed = raw.trim();
	if (trimmed === '') return null;
	const n = Number(trimmed);
	return Number.isFinite(n) ? n : null;
}

/**
 * Enforce HTML LS §4.10.14 inequalities for `<meter>`:
 * minimum ≤ value ≤ maximum, plus minimum ≤ low/high/optimum ≤ maximum
 * and low ≤ high when both are specified. Defaults: min=0, max=1,
 * value=min.
 *
 * @see https://html.spec.whatwg.org/multipage/form-elements.html#the-meter-element
 */
export default createRule<boolean, null>({
	meta: meta,
	defaultValue: true,
	defaultOptions: null,
	async verify({ document, report, t }) {
		await document.walkOn('Element', el => {
			if (el.localName !== 'meter') return;
			// Pretender meters with no `as` pin: descendants/attributes are unknown until typed.
			if (el.pretenderContext?.type === 'pretender' && !el.hasAttribute('as')) return;

			const valueAttr = el.getAttributeNode('value');
			const minAttr = el.getAttributeNode('min');
			const maxAttr = el.getAttributeNode('max');
			const lowAttr = el.getAttributeNode('low');
			const highAttr = el.getAttributeNode('high');
			const optimumAttr = el.getAttributeNode('optimum');

			if (
				valueAttr?.isDynamicValue ||
				minAttr?.isDynamicValue ||
				maxAttr?.isDynamicValue ||
				lowAttr?.isDynamicValue ||
				highAttr?.isDynamicValue ||
				optimumAttr?.isDynamicValue
			) {
				return;
			}

			const valueNum = parseFloatAttr(valueAttr?.value);
			const minNum = parseFloatAttr(minAttr?.value);
			const maxNum = parseFloatAttr(maxAttr?.value);
			const lowNum = parseFloatAttr(lowAttr?.value);
			const highNum = parseFloatAttr(highAttr?.value);
			const optimumNum = parseFloatAttr(optimumAttr?.value);

			// Authored-but-unparseable values are reported by `invalid-attr`; skip the bounds
			// check entirely so we don't compound the diagnostic noise.
			if (
				(valueAttr && valueNum === null) ||
				(minAttr && minNum === null) ||
				(maxAttr && maxNum === null) ||
				(lowAttr && lowNum === null) ||
				(highAttr && highNum === null) ||
				(optimumAttr && optimumNum === null)
			) {
				return;
			}

			const minValue = minNum ?? DEFAULT_MIN;
			const maxValue = maxNum ?? DEFAULT_MAX;
			const valueValue = valueNum ?? minValue;

			type ReportableAttr = ReturnType<typeof el.getAttributeNode>;
			const reportLE = (
				lowerName: string,
				lowerAttr: ReportableAttr,
				upperName: string,
				upperAttr: ReportableAttr,
				upperDefault: number,
			) => {
				const upperDesc = upperAttr
					? t('the value of the "{0}" attribute', upperName)
					: t(
							'{0} when the "{1}" attribute is absent',
							upperDefault === 1 ? 'one' : String(upperDefault),
							upperName,
						);
				const message = t(
					'The value of the "{0}" attribute must be less than or equal to {1}',
					lowerName,
					upperDesc,
				);
				const scope = lowerAttr ?? upperAttr;
				if (scope) {
					report({
						scope: scope,
						line: scope.valueNode?.startLine,
						col: scope.valueNode?.startCol,
						raw: scope.valueNode?.raw,
						message: message,
					});
				} else {
					report({ scope: el, message: message });
				}
			};

			if (minValue > maxValue) {
				reportLE('min', minAttr, 'max', maxAttr, DEFAULT_MAX);
			}
			if (minValue > valueValue) {
				reportLE('min', minAttr, 'value', valueAttr, DEFAULT_MIN);
			}
			if (valueValue > maxValue) {
				reportLE('value', valueAttr, 'max', maxAttr, DEFAULT_MAX);
			}

			if (lowAttr && lowNum !== null) {
				if (minValue > lowNum) {
					reportLE('min', minAttr, 'low', lowAttr, DEFAULT_MIN);
				}
				if (lowNum > maxValue) {
					reportLE('low', lowAttr, 'max', maxAttr, DEFAULT_MAX);
				}
			}

			if (highAttr && highNum !== null) {
				if (minValue > highNum) {
					reportLE('min', minAttr, 'high', highAttr, DEFAULT_MIN);
				}
				if (highNum > maxValue) {
					reportLE('high', highAttr, 'max', maxAttr, DEFAULT_MAX);
				}
			}

			if (optimumAttr && optimumNum !== null) {
				if (minValue > optimumNum) {
					reportLE('min', minAttr, 'optimum', optimumAttr, DEFAULT_MIN);
				}
				if (optimumNum > maxValue) {
					reportLE('optimum', optimumAttr, 'max', maxAttr, DEFAULT_MAX);
				}
			}

			if (lowAttr && highAttr && lowNum !== null && highNum !== null && lowNum > highNum) {
				reportLE('low', lowAttr, 'high', highAttr, 0);
			}
		});
	},
});
