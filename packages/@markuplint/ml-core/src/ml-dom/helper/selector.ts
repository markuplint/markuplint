import { Selector as CSSSelector, CssSelectorParser } from 'css-selector-parser';

interface ElementLikeObject {
	nodeName: string;
	id?: string;
	classList?: string[] | DOMTokenList;
	parentNode: this | null;
	getAttribute?: (attrName: string) => string | null;
}

class Selector {
	#rawSelector: string;
	#ruleset: CSSSelector;

	constructor(selector: string) {
		const selectorParser = new CssSelectorParser();
		selectorParser.registerSelectorPseudos('not');
		selectorParser.registerAttrEqualityMods('~', '^', '$', '*', '|');

		this.#rawSelector = selector;
		this.#ruleset = selectorParser.parse(selector);
	}

	match(element: ElementLikeObject) {
		return match(element, this.#ruleset, this.#rawSelector);
	}
}

function match(element: ElementLikeObject, ruleset: CSSSelector, rawSelector: string) {
	const rules = ruleset.type === 'selectors' ? ruleset.selectors.map(ruleSet => ruleSet.rule) : [ruleset.rule];
	const orMatch: boolean[] = [];

	for (const rule of rules) {
		const andMatch: boolean[] = [];

		if (rule.id) {
			andMatch.push(rule.id === element.id);
		}

		if (rule.classNames) {
			andMatch.push(
				rule.classNames.every(className =>
					Array.isArray(element.classList)
						? element.classList.includes(className)
						: element.classList?.contains(className),
				),
			);
		}

		if (rule.tagName) {
			if (rule.tagName === '*') {
				andMatch.push(true);
			} else {
				andMatch.push(rule.tagName.toLowerCase() === element.nodeName.toLowerCase());
			}
		}

		if (rule.attrs && element.getAttribute) {
			for (const ruleAttr of rule.attrs) {
				const value = element.getAttribute(ruleAttr.name);
				if (value == null) {
					andMatch.push(false);
					continue;
				}

				if (!('value' in ruleAttr && 'operator' in ruleAttr)) {
					andMatch.push(true);
					continue;
				}

				switch (ruleAttr.operator) {
					case '=': {
						// if (ruleAttr.ignoreCase) {
						// 	andMatch.push(value === ruleAttr.value);
						// } else {
						// 	andMatch.push(value.toLowerCase() === ruleAttr.value.toLowerCase());
						// }
						andMatch.push(value === ruleAttr.value);
						break;
					}
					case '~=': {
						throw new Error(`Unsupport "[attr~=val]" attribute selector in "${rawSelector}"`);
					}
					case '^=': {
						// const re = new RegExp(`^${ruleAttr.value}`, ruleAttr.ignoreCase ? 'i' : undefined);
						const re = new RegExp(`^${ruleAttr.value}`);
						andMatch.push(re.test(value));
						break;
					}
					case '$=': {
						// const re = new RegExp(`${ruleAttr.value}$`, ruleAttr.ignoreCase ? 'i' : undefined);
						const re = new RegExp(`${ruleAttr.value}$`);
						andMatch.push(re.test(value));
						break;
					}
					case '*=': {
						// const re = new RegExp(ruleAttr.value, ruleAttr.ignoreCase ? 'i' : undefined);
						const re = new RegExp(ruleAttr.value);
						andMatch.push(re.test(value));
						break;
					}
					// case '!=': {
					// 	throw new Error(`Unsupport "[attr!=val]" attribute selector in "${rawSelector}"`);
					// }
					case '|=': {
						throw new Error(`Unsupport "[attr|=val]" attribute selector in "${rawSelector}"`);
					}
				}
				break;
			}
		}

		if (rule.pseudos) {
			for (const pseudo of rule.pseudos) {
				switch (pseudo.name) {
					case 'not': {
						if (pseudo.valueType !== 'selector') {
							throw new Error(`Unexpected parameters in "not" pseudo selector in "${rawSelector}"`);
						}
						andMatch.push(!match(element, pseudo.value, rawSelector));
						break;
					}
					case 'root': {
						andMatch.push(!element.parentNode);
						break;
					}
					default: {
						throw new Error(`Unsupport "${pseudo.name}" pseudo selector in "${rawSelector}"`);
					}
				}
			}
		}

		orMatch.push(andMatch.length ? andMatch.every(b => b) : false);
	}

	return orMatch.some(b => b);
}

export function createSelector(selector: string) {
	return new Selector(selector);
}
