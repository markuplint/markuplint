import type { EndTagType, MLASTParentNode, ParserOptions as ConfigParserOptions, MLASTToken } from '@markuplint/ml-ast';

export type ParserOptions = {
	readonly booleanish?: boolean;
	readonly endTagType?: EndTagType;
	readonly ignoreTags?: readonly IgnoreTag[];
	readonly maskChar?: string;
	readonly tagNameCaseSensitive?: boolean;
	readonly selfCloseType?: SelfCloseType;
	readonly spaceChars?: readonly string[];
	readonly rawTextElements?: readonly string[];
};

export interface MLASTTokenWithEndPosition extends MLASTToken {
	readonly endOffset: number;
	readonly endLine: number;
	readonly endCol: number;
}

export type ParseOptions = ConfigParserOptions & {
	readonly offsetOffset?: number;
	readonly offsetLine?: number;
	readonly offsetColumn?: number;
	readonly depth?: number;
};

export type Tokenized<N extends {} = {}, State extends unknown = null> = {
	readonly ast: N[];
	readonly isFragment: boolean;
	readonly state?: State;
};

export type Token = {
	readonly raw: string;
	readonly startOffset: number;
	readonly startLine: number;
	readonly startCol: number;
};

export type ChildToken = Token & {
	readonly depth: number;
	readonly parentNode: MLASTParentNode | null;
};

export type SelfCloseType = 'html' | 'xml' | 'html+xml';

export type Code = {
	readonly type: string;
	readonly index: number;
	readonly startTag: string;
	readonly taggedCode: string;
	readonly endTag: string | null;
	resolved: boolean;
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
	readonly type: ValueType;
	readonly parser?: CustomParser;
};

export type CustomParser = (code: string) => void;

export type ValueType = 'string' | 'script';
