// @ts-ignore
import { CssSelectorParser } from 'css-selector-parser';

import { RuleConfigValue } from '@markuplint/ml-config';
import { MLDOMElement } from '../tokens';

const selectorParser = new CssSelectorParser();
selectorParser.registerSelectorPseudos('not');
selectorParser.registerNestingOperators('>', '+', '~');
selectorParser.registerAttrEqualityMods('~', '^', '$', '*', '|');
selectorParser.enableSubstitutes();

type CssSelectorParserResult = CssSelectorParserResultRuleset | CssSelectorParserResultSelectors;

interface CssSelectorParserResultSelectors {
	type: 'selectors';
	selectors: CssSelectorParserRule[];
}

interface CssSelectorParserResultRuleset {
	type: 'ruleSet';
	rule: CssSelectorParserRule;
}

interface CssSelectorParserRule {
	type: 'rule';
	nestingOperator?: string | null;
	tagName?: string;
	id?: string;
	classNames?: string[];
	attrs?: CssSelectorParserRuleAttr[];
	pseudos?: CssSelectorParserRulePseudo[];
	rule: CssSelectorParserRule;
}

interface CssSelectorParserRuleAttr {
	name: string;
	operator?: string;
	valueType?: 'string';
	value?: string;
}

type CssSelectorParserRulePseudo = CssSelectorParserRulePseudoNormal | CssSelectorParserRulePseudoHasSelectors;

interface CssSelectorParserRulePseudoNormal {
	name: string;
	valueType?: 'string';
	value?: string;
}

interface CssSelectorParserRulePseudoHasSelectors {
	name: string;
	valueType: 'selector';
	value: CssSelectorParserResult;
}

interface ElementLikeObject {
	nodeName: string;
	id: string;
	classList: string[] | DOMTokenList;
	getAttribute(attrName: string): string | null;
}

export class Selector {
	private _rawSelector: string;
	private _ruleset: CssSelectorParserResult;

	constructor(selector: string) {
		this._rawSelector = selector;
		this._ruleset = selectorParser.parse(selector);
		// console.log(JSON.stringify(this._ruleset, null, 2));
	}

	public match<T extends RuleConfigValue, O = null>(element: MLDOMElement<T, O>) {
		return match(element, this._ruleset, this._rawSelector);
	}
}

function match(element: ElementLikeObject, ruleset: CssSelectorParserResult, rawSelector: string) {
	const rules: CssSelectorParserRule[] = ruleset.type === 'selectors' ? ruleset.selectors : [ruleset.rule];
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
						: element.classList.contains(className),
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

		if (rule.attrs) {
			for (const ruleAttr of rule.attrs) {
				const value = element.getAttribute(ruleAttr.name);
				if (value == null) {
					andMatch.push(false);
					continue;
				}

				if (ruleAttr.value == null) {
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
