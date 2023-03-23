export type Translator = (messageTmpl: string | readonly string[], ...keywords: Primitive[]) => string;

export type LocaleSet = {
	locale: string;
	listFormat?: ListFormat;
	keywords?: LocalesKeywords;
	sentences?: LocalesKeywords;
};

export type ListFormat = {
	quoteStart: string;
	quoteEnd: string;
	separator: string;
};

export type Primitive = string | number | boolean;

export type LocalesKeywords = {
	[messageId: string]: string | void;
};
