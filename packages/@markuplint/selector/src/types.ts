export type Specificity = readonly [number, number, number];

export type SelectorResult = SelectorMatchedResult | SelectorUnmatchedResult;

export type SelectorMatchedResult = {
	readonly specificity: Specificity;
	readonly matched: true;
	readonly nodes: readonly (Element | Text)[];
	readonly has: readonly SelectorMatchedResult[];
};

export type SelectorUnmatchedResult = {
	readonly specificity: Specificity;
	readonly matched: false;
	readonly not?: readonly SelectorMatchedResult[];
};

export type RegexSelector = RegexSelectorWithoutCombination & {
	readonly combination?: {
		readonly combinator: RegexSelectorCombinator;
	} & RegexSelector;
};

export type RegexSelectorCombinator = ' ' | '>' | '+' | '~' | ':has(+)' | ':has(~)';

export type RegexSelectorWithoutCombination = {
	readonly nodeName?: string;
	readonly attrName?: string;
	readonly attrValue?: string;
};
