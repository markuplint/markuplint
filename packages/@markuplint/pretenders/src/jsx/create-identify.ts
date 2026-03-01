import type { Attr, Identity } from '../types.js';
import type { PretenderAttr } from '@markuplint/ml-config';

/**
 * Creates a pretender identity from a JSX element's tag name, attributes, and slots.
 * If the element has no attributes and no slots, returns just the tag name string.
 * Otherwise, returns a detailed identity object including attributes, slots,
 * and whether the element inherits spread attributes.
 *
 * @param tagName - The HTML element or component tag name
 * @param attrs - The attributes discovered on the JSX element
 * @param slots - Whether the component accepts children (`true`) or not (`null`)
 * @returns A simple tag name string or a detailed Identity object
 */
export function createIndentity(tagName: string, attrs: readonly Attr[], slots: null | true) {
	if (attrs.length === 0 && slots !== true) {
		return tagName;
	}

	const availableAttrs = attrs.filter(attr => attr.nodeType !== 'spread');
	const hasSpread = attrs.some(attr => attr.nodeType === 'spread');
	const pretenderAttrs: PretenderAttr[] = availableAttrs.map(attr => {
		const pretenderAttr: PretenderAttr = {
			name: attr.name,
		};
		if (attr.nodeType === 'static' && attr.value) {
			// @ts-ignore initialize readonly property
			pretenderAttr.value = attr.value;
		}
		return pretenderAttr;
	});

	const identify: Identity = {
		element: tagName,
		slots,
	};

	if (pretenderAttrs.length > 0) {
		// @ts-ignore initialize readonly property
		identify.attrs = pretenderAttrs;
	}

	if (hasSpread) {
		// @ts-ignore initialize readonly property
		identify.inheritAttrs = true;
	}

	return identify;
}
