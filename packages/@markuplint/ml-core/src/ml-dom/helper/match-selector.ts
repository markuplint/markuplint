import type MLDOMAbstractElement from '../tokens/abstract-element';
import type { Specificity } from './selector';
import type { RegexSelector, RegexSelectorCombinator, RegexSelectorWithoutCompination } from '@markuplint/ml-config';

import { regexSelectorMatches } from '@markuplint/ml-config';

import { createSelector } from './selector';

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

type TargetElement = MLDOMAbstractElement<any, any>;

export function matchSelector(el: TargetElement, selector: string | RegexSelector | undefined): SelectorMatches {
	if (!selector) {
		return {
			matched: false,
		};
	}

	if (typeof selector === 'string') {
		const sel = createSelector(selector);
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

function regexSelect(el: TargetElement, selector: RegexSelector): SelectorMatches {
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

	match(el: TargetElement): SelectorMatches {
		const unitCheck = this._matchWithoutCombinateChecking(el);
		if (!unitCheck.matched) {
			return unitCheck;
		}
		if (!this._combinatedFrom) {
			return unitCheck;
		}
		const { target, combinator } = this._combinatedFrom;
		switch (combinator) {
			// Descendant combinator
			case ' ': {
				let ancestor = el.getParentElement();
				while (ancestor) {
					const matches = target.match(ancestor);
					if (matches.matched) {
						return mergeMatches(matches, unitCheck, ' ');
					}
					ancestor = ancestor.getParentElement();
				}
				return {
					matched: false,
				};
			}
			// Child combinator
			case '>': {
				const parentNode = el.getParentElement();
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

	_matchWithoutCombinateChecking(el: TargetElement) {
		return uncombinatedRegexSelect(el, this._selector);
	}

	from(target: SelectorTarget, combinator: RegexSelectorCombinator) {
		this._combinatedFrom = { target, combinator };
	}
}

function uncombinatedRegexSelect(el: TargetElement, selector: RegexSelectorWithoutCompination): SelectorMatches {
	let matched = true;
	let data: Record<string, string> = {};
	let tagSelector = '';
	const specificity: Specificity = [0, 0, 0];
	const specifiedAttr = new Map<string, string>();

	if (selector.nodeName) {
		const matchedNodeName = regexSelectorMatches(selector.nodeName, el.nodeName);
		if (matchedNodeName) {
			delete matchedNodeName.$0;
		} else {
			matched = false;
		}
		data = {
			...data,
			...matchedNodeName,
		};

		tagSelector = el.nodeName;

		specificity[2] = 1;
	}

	if (selector.attrName) {
		const selectorAttrName = selector.attrName;
		const matchedAttrNameList = el.attributes.map(attr => {
			const attrName = attr.getName().potential;
			const matchedAttrName = regexSelectorMatches(selectorAttrName, attrName);

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
		const matchedAttrValueList = el.attributes.map(attr => {
			const attrName = attr.getName().potential;
			const attrValue = attr.getValue().potential;
			const matchedAttrValue = regexSelectorMatches(selectorAttrValue, attrValue);

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
