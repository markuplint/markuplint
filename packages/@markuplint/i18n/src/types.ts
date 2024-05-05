export interface Translator {
	(messageTmpl: string, ...keywords: readonly Primitive[]): string;
	(messageTmpl: readonly string[], useLastSeparator?: boolean): string;
	(messageTmpl: string | readonly string[], ...keywords: readonly Primitive[]): string;
}

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
	readonly lastSeparator?: string;
};

export type Primitive = string | number | boolean;

export type LocalesKeywords = {
	readonly [messageId: string]: string;
};
