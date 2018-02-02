import Element from './element';
export interface CSSUniversalSelectorRule {
    type: 'universal';
}
export interface CSSTagSelectorRule {
    type: 'tag';
    /**
     * Tag name
     */
    name: string;
}
export interface CSSPseudoSelectorRule {
    type: 'pseudo';
    /**
     * Pseudo selector name
     */
    name: string;
    /**
     * Pseudo selector parameters
     */
    data: string | CSSSelectorRuleSet[] | null;
}
export interface CSSAttrSelectorRule {
    type: 'attribute';
    /**
     * Attribute name
     */
    name: string;
    /**
     * Attribute operator
     *
     * - `[attr]` => `"exists"`
     * - `[attr=val]` => ` "equals"`
     * - `[attr~=val]` => `"element"`
     * - `[attr^=val]` => `"start"`
     * - `[attr$=val]` => `"end"`
     * - `[attr*=val]` => `"any"`
     * - `[attr!=val]` => `"not"`
     * - `[attr|=val]` => `"hyphen"`
     */
    action: 'exists' | 'equals' | 'element' | 'start' | 'end' | 'any' | 'not' | 'hyphen';
    /**
     * Attribute value
     *
     * Return empty string when value is empty.
     */
    value: string;
    /**
     * case-insensitively
     */
    ignoreCase: boolean;
}
export interface UnsupportSelectorRule {
    type: 'descendant' | 'child' | 'parent' | 'sibling' | 'adjacent';
}
export declare type CSSSelectorRule = CSSTagSelectorRule | CSSUniversalSelectorRule | CSSPseudoSelectorRule | CSSAttrSelectorRule | UnsupportSelectorRule;
export declare type CSSSelectorRuleSet = CSSSelectorRule[];
export declare class CSSSelector {
    private _rawSelector;
    private _ruleset;
    constructor(selector: string);
    match<T, O>(element: Element<T, O>): boolean;
}
export default function (selector: string): CSSSelector;
