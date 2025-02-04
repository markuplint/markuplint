import type { Specificity, RegexSelector, RegexSelectorCombinator, RegexSelectorWithoutCombination } from './types.js';
import type { Writable } from 'type-fest';
import type { MLMLSpec } from '@markuplint/ml-spec';

import { isElement, isNonDocumentTypeChildNode, isPureHTMLElement } from './is.js';
import { regexSelectorMatches } from './regex-selector-matches.js';
import { createSelector } from './create-selector.js';

export type SelectorMatches = SelectorMatched | SelectorUnmatched;

type SelectorMatched = {
	readonly matched: true;
	readonly selector: string;
	readonly specificity: Specificity;
	readonly data?: Readonly<Record<string, string>>;
};

type SelectorUnmatched = {
	readonly matched: false;
};

export function matchSelector(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Node,
	selector: string | RegexSelector | undefined,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	scope?: ParentNode | null,
	specs?: MLMLSpec,
): SelectorMatches {
	if (selector == null || selector === '') {
		return {
			matched: false,
		};
	}

	if (typeof selector === 'string') {
		const sel = createSelector(selector, specs);
		const specificity = sel.match(el, scope);
		if (specificity !== false) {
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

function regexSelect(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Node,
	selector: RegexSelector,
): SelectorMatches {
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
	#combinedFrom: {
		target: Readonly<SelectorTarget>;
		combinator: RegexSelectorCombinator;
	} | null = null;

	#selector: RegexSelectorWithoutCombination;

	constructor(selector: RegexSelectorWithoutCombination) {
		this.#selector = selector;
	}

	from(target: Readonly<SelectorTarget>, combinator: RegexSelectorCombinator) {
		this.#combinedFrom = { target, combinator };
	}

	match(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		el: Node,
	): SelectorMatches {
		const unitCheck = this._matchWithoutCombineChecking(el);
		if (!unitCheck.matched) {
			return unitCheck;
		}
		if (!this.#combinedFrom) {
			return unitCheck;
		}
		if (!isNonDocumentTypeChildNode(el)) {
			return unitCheck;
		}
		const { target, combinator } = this.#combinedFrom;
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
				throw new Error(`Unsupported ${this.#combinedFrom.combinator} combinator in selector`);
			}
		}
	}

	private _matchWithoutCombineChecking(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		el: Node,
	) {
		return uncombinedRegexSelect(el, this.#selector);
	}
}

function uncombinedRegexSelect(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Node,
	selector: RegexSelectorWithoutCombination,
): SelectorMatches {
	if (!isElement(el)) {
		return {
			matched: false,
		};
	}

	let matched = true;
	let data: Record<string, string> = {};
	let tagSelector = '';
	const specificity: Writable<Specificity> = [0, 0, 0];
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

	type MatchedAttr = Record<string, string>;
	const isPure = isPureHTMLElement(el);

	if (selector.attrName || selector.attrValue) {
		const matchedAttrList: MatchedAttr[] = [...el.attributes]
			.map<MatchedAttr | null>(attr => {
				const matchedAttrName = regexSelectorMatches(selector.attrName, attr.name, isPure);
				if (selector.attrName && !matchedAttrName) {
					return null;
				}

				const matchedAttrValue = regexSelectorMatches(selector.attrValue, attr.value, isPure);

				if (selector.attrValue && !matchedAttrValue) {
					return null;
				}

				if (matchedAttrName) {
					delete matchedAttrName.$0;
				}

				if (matchedAttrValue) {
					delete matchedAttrValue.$0;
				}

				data = {
					...data,
					...matchedAttrName,
					...matchedAttrValue,
				};

				specifiedAttr.set(attr.name, matchedAttrValue ? attr.value : '');

				return matchedAttrValue ?? matchedAttrName ?? null;
			})
			.filter((a): a is MatchedAttr => !!a);

		if (matchedAttrList.length === 0) {
			matched = false;
		}
	}

	const attrSelector = [...specifiedAttr.entries()]
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
