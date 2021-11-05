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
		delete matchedNodeName.$0;
		matchedMap = {
			...matchedMap,
			...matchedNodeName,
			__node: targetElement.nodeName,
		};
	}

	if (selector.attrName) {
		const selectorAttrName = selector.attrName;
		const matchedAttrNameList = el.attributes.map(attr => {
			const attrName = attr.getName().raw;
			const matchedAttrName = regexSelectorMatches(selectorAttrName, attrName);

			if (matchedAttrName) {
				delete matchedAttrName.$0;
				matchedMap = {
					...matchedMap,
					...matchedAttrName,
					__node: matchedMap.__node ? `${matchedMap.__node}[${attrName}]` : `[${attrName}]`,
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
		const matchedAttrValueList = el.attributes.map(attr => {
			const attrName = attr.getName().raw;
			const attrValue = attr.getValue().raw;
			const matchedAttrValue = regexSelectorMatches(selectorAttrValue, attrValue);

			if (matchedAttrValue) {
				delete matchedAttrValue.$0;
				matchedMap = {
					...matchedMap,
					...matchedAttrValue,
					__node: matchedMap.__node
						? `${matchedMap.__node}[${attrName}="${attrValue}"]`
						: `[${attrName}="${attrValue}"]`,
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
