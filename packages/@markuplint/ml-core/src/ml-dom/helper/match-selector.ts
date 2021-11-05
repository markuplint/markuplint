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
		const $0 = matchedNodeName.$0;
		delete matchedNodeName.$0;
		matchedMap = {
			__nodeName: $0,
			...matchedMap,
			...matchedNodeName,
		};
	}

	if (selector.attrName) {
		const selectorAttrName = selector.attrName;
		let count = 0;
		const matchedAttrNameList = targetElement.attributes.map(attr => {
			const attrName = attr.getName().raw;
			const matchedAttrName = regexSelectorMatches(selectorAttrName, attrName);

			if (matchedAttrName) {
				const $0 = matchedAttrName.$0;
				delete matchedAttrName.$0;
				matchedMap = {
					[`__attrName${count++}`]: $0,
					...matchedMap,
					...matchedAttrName,
				};
			}

			return matchedAttrName;
		});

		if (!matchedAttrNameList.some(_ => !!_)) {
			return null;
		}
	}

	if (selector.attrValue) {
		const selectorAttrValue = selector.attrValue;
		let count = 0;
		const matchedAttrValueList = targetElement.attributes.map(attr => {
			const attrValue = attr.getValue().raw;
			const matchedAttrValue = regexSelectorMatches(selectorAttrValue, attrValue);

			if (matchedAttrValue) {
				const $0 = matchedAttrValue.$0;
				delete matchedAttrValue.$0;
				matchedMap = {
					[`__attrValue${count++}`]: $0,
					...matchedMap,
					...matchedAttrValue,
				};
			}

			return matchedAttrValue;
		});

		if (!matchedAttrValueList.some(_ => !!_)) {
			return null;
		}
	}

	return matchedMap;
}
