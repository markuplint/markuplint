// // @ts-ignore
// import cssWhat from 'css-what';

// import Element from './element';

// export interface CSSUniversalSelectorRule {
// 	type: 'universal';
// }

// export interface CSSTagSelectorRule {
// 	type: 'tag';

// 	/**
// 	 * Tag name
// 	 */
// 	name: string;
// }

// export interface CSSPseudoSelectorRule {
// 	type: 'pseudo';

// 	/**
// 	 * Pseudo selector name
// 	 */
// 	name: string;

// 	/**
// 	 * Pseudo selector parameters
// 	 */
// 	data: string | CSSSelectorRuleSet[] | null;
// }

// export interface CSSAttrSelectorRule {
// 	type: 'attribute';

// 	/**
// 	 * Attribute name
// 	 */
// 	name: string;

// 	/**
// 	 * Attribute operator
// 	 *
// 	 * - `[attr]` => `"exists"`
// 	 * - `[attr=val]` => ` "equals"`
// 	 * - `[attr~=val]` => `"element"`
// 	 * - `[attr^=val]` => `"start"`
// 	 * - `[attr$=val]` => `"end"`
// 	 * - `[attr*=val]` => `"any"`
// 	 * - `[attr!=val]` => `"not"`
// 	 * - `[attr|=val]` => `"hyphen"`
// 	 */
// 	action: 'exists' | 'equals' | 'element' | 'start' | 'end' | 'any' | 'not' | 'hyphen';

// 	/**
// 	 * Attribute value
// 	 *
// 	 * Return empty string when value is empty.
// 	 */
// 	value: string;

// 	/**
// 	 * case-insensitively
// 	 */
// 	ignoreCase: boolean;
// }

// export interface UnsupportSelectorRule {
// 	type: 'descendant' | 'child' | 'parent' | 'sibling' | 'adjacent';
// }

// export type CSSSelectorRule =
// 	| CSSTagSelectorRule
// 	| CSSUniversalSelectorRule
// 	| CSSPseudoSelectorRule
// 	| CSSAttrSelectorRule
// 	| UnsupportSelectorRule;

// export type CSSSelectorRuleSet = CSSSelectorRule[];

// export class CSSSelector {
// 	private _rawSelector: string;
// 	private _ruleset: CSSSelectorRuleSet[];

// 	constructor(selector: string) {
// 		this._rawSelector = selector;
// 		this._ruleset = cssWhat(selector) || [];
// 		// console.log(JSON.stringify(this._ruleset, null, 2));
// 	}

// 	public match<T, O>(element: Element<T, O>) {
// 		return match(element, this._ruleset, this._rawSelector);
// 	}
// }

// // tslint:disable-next-line:cyclomatic-complexity
// function match<T, O>(element: Element<T, O>, ruleset: CSSSelectorRuleSet[], rawSelector: string) {
// 	const orMatch: boolean[] = [];
// 	for (const selectorRules of ruleset) {
// 		const andMatch: boolean[] = [];
// 		for (const selectorRule of selectorRules) {
// 			switch (selectorRule.type) {
// 				case 'universal': {
// 					// console.log(`true <= "*" in ${element.raw}`);
// 					andMatch.push(true);
// 					break;
// 				}
// 				case 'tag': {
// 					const matched = element.nodeName.toLowerCase() === selectorRule.name.toLowerCase();
// 					// console.log(`${matched} <= "${selectorRule.name}" in ${element.raw}`);
// 					andMatch.push(matched);
// 					break;
// 				}
// 				case 'pseudo': {
// 					switch (selectorRule.name) {
// 						case 'not': {
// 							if (!selectorRule.data || typeof selectorRule.data === 'string') {
// 								throw new Error(`Unexpected parameters in "not" pseudo selector in "${rawSelector}"`);
// 							}
// 							andMatch.push(!match(element, selectorRule.data, rawSelector));
// 							break;
// 						}
// 						default: {
// 							throw new Error(`Unsupport "${selectorRule.name}" pseudo selector in "${rawSelector}"`);
// 						}
// 					}
// 					break;
// 				}
// 				case 'attribute': {
// 					const attr = element.getAttribute(selectorRule.name);
// 					if (!attr) {
// 						andMatch.push(false);
// 						continue;
// 					}
// 					const value = attr.value ? attr.value.value : '';
// 					switch (selectorRule.action) {
// 						case 'exists': {
// 							andMatch.push(true);
// 							break;
// 						}
// 						case 'equals': {
// 							if (selectorRule.ignoreCase) {
// 								andMatch.push(value === selectorRule.value);
// 							} else {
// 								andMatch.push(value.toLowerCase() === selectorRule.value.toLowerCase());
// 							}
// 							break;
// 						}
// 						case 'element': {
// 							throw new Error(`Unsupport "[attr~=val]" attribute selector in "${rawSelector}"`);
// 						}
// 						case 'start': {
// 							const re = new RegExp(`^${selectorRule.value}`, selectorRule.ignoreCase ? 'i' : undefined);
// 							andMatch.push(re.test(value));
// 							break;
// 						}
// 						case 'end': {
// 							const re = new RegExp(`${selectorRule.value}$`, selectorRule.ignoreCase ? 'i' : undefined);
// 							andMatch.push(re.test(value));
// 							break;
// 						}
// 						case 'any': {
// 							const re = new RegExp(selectorRule.value, selectorRule.ignoreCase ? 'i' : undefined);
// 							andMatch.push(re.test(value));
// 							break;
// 						}
// 						case 'not': {
// 							throw new Error(`Unsupport "[attr!=val]" attribute selector in "${rawSelector}"`);
// 						}
// 						case 'hyphen': {
// 							throw new Error(`Unsupport "[attr|=val]" attribute selector in "${rawSelector}"`);
// 						}
// 					}
// 					break;
// 				}
// 				default: {
// 					throw new Error(`Unsupport ${selectorRule.type} selector in "${rawSelector}"`);
// 				}
// 			}
// 		}
// 		orMatch.push(andMatch.every(b => b));
// 	}
// 	return orMatch.some(b => b);
// }

// export default function(selector: string) {
// 	return new CSSSelector(selector);
// }
