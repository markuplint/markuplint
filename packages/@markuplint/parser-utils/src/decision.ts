import { isCustomElementName } from '@markuplint/types';

import { svgElementList } from './const';

/**
 *
 *
 * @param nodeName
 * @returns
 */
export function isSVGElement(nodeName: string) {
	return svgElementList.includes(nodeName);
}

const isCEN = isCustomElementName();
export function isPotentialCustomElementName(tagName: string) {
	return isCEN(tagName);
}
