export type Specificity = [number, number, number];

export type RegexSelector = RegexSelectorWithoutCompination & {
	combination?: {
		combinator: RegexSelectorCombinator;
	} & RegexSelector;
};

export type RegexSelectorCombinator = ' ' | '>' | '+' | '~' | ':has(+)' | ':has(~)';

export type RegexSelectorWithoutCompination = {
	nodeName?: string;
	attrName?: string;
	attrValue?: string;
};
