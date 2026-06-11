import type { Attr, Identity } from '../types.js';
import type { PretenderAttr } from '@markuplint/ml-config';

/**
 * Returns just the tag name string when the element has no attributes and no slots;
 * otherwise a detailed identity object including attributes, slots, and whether the
 * element inherits spread attributes.
 */
export function createIdentity(tagName: string, attrs: readonly Attr[], slots: null | true) {
	if (attrs.length === 0 && slots !== true) {
		return tagName;
	}

	const availableAttrs = attrs.filter(attr => attr.nodeType !== 'spread');
	const hasSpread = attrs.some(attr => attr.nodeType === 'spread');
	const pretenderAttrs: PretenderAttr[] = availableAttrs.map(attr =>
		attr.nodeType === 'static' && attr.value ? { name: attr.name, value: attr.value } : { name: attr.name },
	);

	const identify: Identity = {
		element: tagName,
		slots,
		...(pretenderAttrs.length > 0 ? { attrs: pretenderAttrs } : {}),
		...(hasSpread ? { inheritAttrs: true as const } : {}),
	};

	return identify;
}
