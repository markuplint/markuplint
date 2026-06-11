import type { MLASTElement } from '@markuplint/ml-ast';
import type { PretenderAttr } from '@markuplint/ml-config';

/**
 * Only includes attributes with type `'attr'` (regular HTML attributes).
 * Spread attributes are skipped. Boolean attributes (no value) are included
 * without a `value` property.
 */
export function extractAttrs(element: MLASTElement): readonly PretenderAttr[] {
	const result: PretenderAttr[] = [];

	for (const attr of element.attributes) {
		if (attr.type !== 'attr') {
			continue;
		}

		const value = attr.value.raw;
		if (value === '') {
			result.push({ name: attr.nodeName });
		} else {
			result.push({ name: attr.nodeName, value });
		}
	}

	return result;
}
