export type Specificity = [number, number, number];

export type SelectorResult = SelectorMatchedResult | SelectorUnmatchedResult;

export type SelectorMatchedResult = {
	specificity: Specificity;
	matched: true;
	nodes: (Element | Text)[];
	has: SelectorMatchedResult[];
};

export type SelectorUnmatchedResult = {
	specificity: Specificity;
	matched: false;
	not?: SelectorMatchedResult[];
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
