import type { Attr, Identity } from '../types';
import type { PretenderAttr } from '@markuplint/ml-config';

export function createIndentity(tagName: string, attrs: Attr[]) {
	if (!attrs.length) {
		return tagName;
	}

	const availableAttrs = attrs.filter(attr => attr.nodeType !== 'spread');
	const hasSpread = attrs.some(attr => attr.nodeType === 'spread');
	const pretenderAttrs: PretenderAttr[] = availableAttrs.map(attr => {
		const pretenderAttr: PretenderAttr = {
			name: attr.name,
		};
		if (attr.nodeType === 'static' && attr.value) {
			pretenderAttr.value = attr.value;
		}
		return pretenderAttr;
	});

	const identify: Identity = {
		element: tagName,
	};

	if (pretenderAttrs.length) {
		identify.attrs = pretenderAttrs;
	}

	if (hasSpread) {
		identify.inheritAttrs = true;
	}

	return identify;
}
