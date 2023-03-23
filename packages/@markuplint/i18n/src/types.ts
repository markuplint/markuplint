export type Translator = (messageTmpl: string | readonly string[], ...keywords: readonly Primitive[]) => string;

export type LocaleSet = {
	readonly locale: string;
	readonly listFormat?: ListFormat;
	readonly keywords?: LocalesKeywords;
	readonly sentences?: LocalesKeywords;
};

export type ListFormat = {
	readonly quoteStart: string;
	readonly quoteEnd: string;
	readonly separator: string;
};

export type Primitive = string | number | boolean;

export type LocalesKeywords = {
	readonly [messageId: string]: string;
};
