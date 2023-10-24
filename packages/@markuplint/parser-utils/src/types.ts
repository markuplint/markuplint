export type Code = {
	readonly type: string;
	readonly index: number;
	readonly startTag: string;
	readonly taggedCode: string;
	readonly endTag: string | null;
};

export type IgnoreTag = {
	readonly type: string;
	readonly start: Readonly<RegExp> | string;
	readonly end: Readonly<RegExp> | string;
};

export type IgnoreBlock = {
	readonly source: string;
	readonly replaced: string;
	readonly stack: readonly Code[];
	readonly maskChar: string;
};

export type QuoteSet = {
	readonly start: string;
	readonly end: string;
};
