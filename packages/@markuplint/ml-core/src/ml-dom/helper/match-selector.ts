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
		const selectorAttrName = selector.attrName;
		const matchedAttrNameList = targetElement.attributes.map(attr => {
			const attrName = attr.getName().raw;
			const matchedAttrName = regexSelectorMatches(selectorAttrName, attrName);

			matchedMap = {
				...matchedMap,
				...matchedAttrName,
			};

			return matchedAttrName;
		});

		if (!matchedAttrNameList.some(_ => !!_)) {
			return null;
		}
	}

	if (selector.attrValue) {
		const selectorAttrValue = selector.attrValue;
		const matchedAttrValueList = targetElement.attributes.map(attr => {
			const attrValue = attr.getValue().raw;
			const matchedAttrValue = regexSelectorMatches(selectorAttrValue, attrValue);
			matchedMap = {
				...matchedMap,
				...matchedAttrValue,
			};

			return matchedAttrValue;
		});

		if (!matchedAttrValueList.some(_ => !!_)) {
			return null;
		}
	}

	return matchedMap;
}
