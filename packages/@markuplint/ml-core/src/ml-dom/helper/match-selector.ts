import { RegexSelector, regexSelectorMatches } from '@markuplint/ml-config';
import { MLDOMElement } from '../tokens';
import { createSelector } from './selector';

export function matchSelector(
	targetElement: MLDOMElement<any, any>,
	selector: string | RegexSelector | undefined,
): Record<string, string> | null {
	if (!selector) {
		return null;
	}

	if (typeof selector === 'string') {
		const sel = createSelector(selector);
		const matched = sel.match(targetElement);
		return matched ? {} : null;
	}

	let matchedMap: Record<string, string> = {};

	if (selector.nodeName) {
		const matchedNodeName = regexSelectorMatches(selector.nodeName, targetElement.nodeName);
		if (!matchedNodeName) {
			return null;
		}
		matchedMap = {
			...matchedMap,
			...matchedNodeName,
		};
	}

	if (selector.attrName) {
		const matchedAttrNameList: ReturnType<typeof regexSelectorMatches>[] = [];
		for (const attr of targetElement.attributes) {
			const attrName = attr.getName().raw;
			const matchedAttrName = regexSelectorMatches(selector.attrName, attrName);
			matchedAttrNameList.push(matchedAttrName);
			matchedMap = {
				...matchedMap,
				...matchedAttrName,
			};
		}

		if (!matchedAttrNameList.some(_ => !!_)) {
			return null;
		}
	}

	if (selector.attrValue) {
		const matchedAttrValueList: ReturnType<typeof regexSelectorMatches>[] = [];
		for (const attr of targetElement.attributes) {
			const attrValue = attr.getValue().raw;
			const matchedAttrValue = regexSelectorMatches(selector.attrValue, attrValue);
			matchedAttrValueList.push(matchedAttrValue);
			matchedMap = {
				...matchedMap,
				...matchedAttrValue,
			};
		}

		if (!matchedAttrValueList.some(_ => !!_)) {
			return null;
		}
	}

	return matchedMap;
}
