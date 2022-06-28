import type { Specificity, RegexSelector, RegexSelectorCombinator, RegexSelectorWithoutCompination } from './types';

import { isElement, isNonDocumentTypeChildNode, isPureHTMLElement } from './is';
import { regexSelectorMatches } from './regex-selector-matches';
import { Selector } from './selector';

export type SelectorMatches = SelectorMatched | SelectorUnmatched;

type SelectorMatched = {
	matched: true;
	selector: string;
	specificity: Specificity;
	data?: Record<string, string>;
};

type SelectorUnmatched = {
	matched: false;
};

export function matchSelector(el: Node, selector: string | RegexSelector | undefined): SelectorMatches {
	if (!selector) {
		return {
			matched: false,
		};
	}

	if (typeof selector === 'string') {
		const sel = new Selector(selector);
		const specificity = sel.match(el);
		if (specificity) {
			return {
				matched: true,
				selector,
				specificity,
			};
		}
		return {
			matched: false,
		};
	}

	return regexSelect(el, selector);
}

function regexSelect(el: Node, selector: RegexSelector): SelectorMatches {
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
		this._selector = selector;
	}

	from(target: SelectorTarget, combinator: RegexSelectorCombinator) {
		this._combinatedFrom = { target, combinator };
	}

	match(el: Node): SelectorMatches {
		const unitCheck = this._matchWithoutCombinateChecking(el);
		if (!unitCheck.matched) {
			return unitCheck;
		}
		if (!this._combinatedFrom) {
			return unitCheck;
		}
		if (!isNonDocumentTypeChildNode(el)) {
			return unitCheck;
		}
		const { target, combinator } = this._combinatedFrom;
		switch (combinator) {
			// Descendant combinator
			case ' ': {
				let ancestor = el.parentElement;
				while (ancestor) {
					const matches = target.match(ancestor);
					if (matches.matched) {
						return mergeMatches(matches, unitCheck, ' ');
					}
					ancestor = ancestor.parentElement;
				}
				return {
					matched: false,
				};
			}
			// Child combinator
			case '>': {
				const parentNode = el.parentElement;
				if (!parentNode) {
					return { matched: false };
				}
				const matches = target.match(parentNode);
				if (matches.matched) {
					return mergeMatches(matches, unitCheck, ' > ');
				}
				return { matched: false };
			}
			// Next-sibling combinator
			case '+': {
				if (!el.previousElementSibling) {
					return { matched: false };
				}
				const matches = target.match(el.previousElementSibling);
				if (matches.matched) {
					return mergeMatches(matches, unitCheck, ' + ');
				}
				return { matched: false };
			}
			// Subsequent-sibling combinator
			case '~': {
				let prev = el.previousElementSibling;
				while (prev) {
					const matches = target.match(prev);
					if (matches.matched) {
						return mergeMatches(matches, unitCheck, ' ~ ');
					}
					prev = prev.previousElementSibling;
				}
				return { matched: false };
			}
			// Prev-sibling combinator
			case ':has(+)': {
				if (!el.nextElementSibling) {
					return { matched: false };
				}
				const matches = target.match(el.nextElementSibling);
				if (matches.matched) {
					return mergeMatches(matches, unitCheck, ':has(+ ', true);
				}
				return { matched: false };
			}
			// Subsequent-sibling (in front) combinator
			case ':has(~)': {
				let next = el.nextElementSibling;
				while (next) {
					const matches = target.match(next);
					if (matches.matched) {
						return mergeMatches(matches, unitCheck, ':has(~ ', true);
					}
					next = next.nextElementSibling;
				}
				return { matched: false };
			}
			default: {
				throw new Error(`Unsupported ${this._combinatedFrom.combinator} combinator in selector`);
			}
		}
	}

	_matchWithoutCombinateChecking(el: Node) {
		return uncombinatedRegexSelect(el, this._selector);
	}
}

function uncombinatedRegexSelect(el: Node, selector: RegexSelectorWithoutCompination): SelectorMatches {
	if (!isElement(el)) {
		return {
			matched: false,
		};
	}

	let matched = true;
	let data: Record<string, string> = {};
	let tagSelector = '';
	const specificity: Specificity = [0, 0, 0];
	const specifiedAttr = new Map<string, string>();

	if (selector.nodeName) {
		const matchedNodeName = regexSelectorMatches(selector.nodeName, el.localName, isPureHTMLElement(el));
		if (matchedNodeName) {
			delete matchedNodeName.$0;
		} else {
			matched = false;
		}
		data = {
			...data,
			...matchedNodeName,
		};

		tagSelector = el.localName;

		specificity[2] = 1;
	}

	if (selector.attrName) {
		const selectorAttrName = selector.attrName;
		const matchedAttrNameList = Array.from(el.attributes).map(attr => {
			const attrName = attr.name;
			const matchedAttrName = regexSelectorMatches(selectorAttrName, attrName, isPureHTMLElement(el));

			if (matchedAttrName) {
				delete matchedAttrName.$0;
				data = {
					...data,
					...matchedAttrName,
				};
				specifiedAttr.set(attrName, '');
			}

			return matchedAttrName;
		});

		if (!matchedAttrNameList.some(_ => !!_)) {
			matched = false;
		}
	}

	if (selector.attrValue) {
		const selectorAttrValue = selector.attrValue;
		const matchedAttrValueList = Array.from(el.attributes).map(attr => {
			const attrName = attr.name;
			const attrValue = attr.value;
			const matchedAttrValue = regexSelectorMatches(selectorAttrValue, attrValue, isPureHTMLElement(el));

			if (matchedAttrValue) {
				delete matchedAttrValue.$0;
				data = {
					...data,
					...matchedAttrValue,
				};
				specifiedAttr.set(attrName, attrValue);
			}

			return matchedAttrValue;
		});

		if (!matchedAttrValueList.some(_ => !!_)) {
			matched = false;
		}
	}

	const attrSelector = Array.from(specifiedAttr.entries())
		.map(([name, value]) => {
			return `[${name}${value ? `="${value}"` : ''}]`;
		})
		.join('');

	specificity[1] += specifiedAttr.size;

	if (matched) {
		return {
			matched,
			selector: `${tagSelector}${attrSelector}`,
			specificity,
			data,
		};
	}

	return { matched };
}

function mergeMatches(a: SelectorMatched, b: SelectorMatched, sep: string, close = false): SelectorMatched {
	return {
		matched: true,
		selector: `${a.selector}${sep}${b.selector}${close ? ')' : ''}`,
		specificity: [
			a.specificity[0] + b.specificity[0],
			a.specificity[1] + b.specificity[1],
			a.specificity[2] + b.specificity[2],
		],
		data: {
			...a.data,
			...b.data,
		},
	};
}
