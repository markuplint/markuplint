import type MLDOMAbstractElement from '../tokens/abstract-element';
import type { RegexSelector, RegexSelectorCombinator, RegexSelectorWithoutCompination } from '@markuplint/ml-config';

import { regexSelectorMatches } from '@markuplint/ml-config';

import { createSelector } from './selector';

type TargetElement = MLDOMAbstractElement<any, any>;

export function matchSelector(
	el: TargetElement,
	selector: string | RegexSelector | undefined,
): Record<string, string> | null {
	if (!selector) {
		return null;
	}

	if (typeof selector === 'string') {
		const sel = createSelector(selector);
		const matched = sel.match(el);
		return matched ? { __node: selector } : null;
	}

	return regexSelect(el, selector);
}

function regexSelect(el: TargetElement, selector: RegexSelector): Record<string, string> | null {
	let edge = new SelectorTarget(selector);
	let edgeSelector = selector.combination;
	while (edgeSelector) {
		const child = new SelectorTarget(edgeSelector);
		child.from(edge, edgeSelector.combinator);
		edge = child;
		edgeSelector = edgeSelector.combination;
	}

	return edge.match(el);
}

class SelectorTarget {
	_selector: RegexSelectorWithoutCompination;
	_combinatedFrom: { target: SelectorTarget; combinator: RegexSelectorCombinator } | null = null;

	constructor(selector: RegexSelectorWithoutCompination) {
		this._selector = {
			nodeName: selector.nodeName,
			attrName: selector.attrName,
			attrValue: selector.attrValue,
		};
	}

	match(el: TargetElement): Record<string, string> | null {
		const matched = this._matchWithoutCombinateChecking(el);
		if (!matched) {
			return null;
		}
		if (!this._combinatedFrom) {
			return matched;
		}
		const { target, combinator } = this._combinatedFrom;
		switch (combinator) {
			// Descendant combinator
			case ' ': {
				let ancestor = el.parentNode;
				while (ancestor) {
					const ancestorMatched = target.match(ancestor);
					if (ancestorMatched) {
						const res = {
							...ancestorMatched,
							...matched,
							__node: `${ancestorMatched.__node} ${matched.__node}`,
						};
						return res;
					}
					ancestor = ancestor.parentNode;
				}
				return null;
			}
			// Child combinator
			case '>': {
				if (!el.parentNode) {
					return null;
				}
				const parentMatched = target.match(el.parentNode);
				if (parentMatched) {
					const res = {
						...parentMatched,
						...matched,
						__node: `${parentMatched.__node} > ${matched.__node}`,
					};
					return res;
				}
				return null;
			}
			// Next-sibling combinator
			case '+': {
				if (!el.previousElementSibling) {
					return null;
				}
				const prevMatched = target.match(el.previousElementSibling);
				if (prevMatched) {
					const res = {
						...prevMatched,
						...matched,
						__node: `${prevMatched.__node} + ${matched.__node}`,
					};
					return res;
				}
				return null;
			}
			// Subsequent-sibling combinator
			case '~': {
				let prev = el.previousElementSibling;
				while (prev) {
					const prevMatched = target.match(prev);
					if (prevMatched) {
						const res = {
							...prevMatched,
							...matched,
							__node: `${prevMatched.__node} ~ ${matched.__node}`,
						};
						return res;
					}
					prev = prev.previousElementSibling;
				}
				return null;
			}
			// Prev-sibling combinator
			case ':has(+)': {
				if (!el.nextElementSibling) {
					return null;
				}
				const nextMatched = target.match(el.nextElementSibling);
				if (nextMatched) {
					const res = {
						...nextMatched,
						...matched,
						__node: `${nextMatched.__node}:has(+ ${matched.__node})`,
					};
					return res;
				}
				return null;
			}
			// Subsequent-sibling (in front) combinator
			case ':has(~)': {
				let next = el.nextElementSibling;
				while (next) {
					const nextMatched = target.match(next);
					if (nextMatched) {
						const res = {
							...nextMatched,
							...matched,
							__node: `${nextMatched.__node}:has(~ ${matched.__node})`,
						};
						return res;
					}
					next = next.nextElementSibling;
				}
				return null;
			}
			default: {
				throw new Error(`Unsupported ${this._combinatedFrom.combinator} combinator in selector`);
			}
		}
	}

	_matchWithoutCombinateChecking(el: TargetElement) {
		return uncombinatedRegexSelect(el, this._selector);
	}

	from(target: SelectorTarget, combinator: RegexSelectorCombinator) {
		this._combinatedFrom = { target, combinator };
	}
}

function uncombinatedRegexSelect(el: TargetElement, selector: RegexSelectorWithoutCompination) {
	let matchedMap: Record<string, string> = {};

	if (selector.nodeName) {
		const matchedNodeName = regexSelectorMatches(selector.nodeName, el.nodeName);
		if (!matchedNodeName) {
			return null;
		}
		delete matchedNodeName.$0;
		matchedMap = {
			...matchedMap,
			...matchedNodeName,
			__node: el.nodeName,
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
