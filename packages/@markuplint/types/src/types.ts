import type { cssSyntaxMatch } from './css-syntax.js';

export type { Type, List, Enum, CssSyntax, KeywordDefinedType, Number, Directive } from './types.schema.js';

export type Result = UnmatchedResult | MatchedResult;

export type UnmatchedResult = {
	readonly matched: false;
	readonly ref: string | null;
	readonly raw: string;
	readonly length: number;
	readonly offset: number;
	readonly line: number;
	readonly column: number;
	readonly reason: UnmatchedResultReason;
	readonly passCount?: number;
} & UnmatchedResultOptions;

export type UnmatchedResultOptions = {
	readonly partName?: string;
	readonly expects?: readonly Expect[];
	readonly extra?: Expect;
	readonly candidate?: string;
	readonly fallbackTo?: string;
};

export type UnmatchedResultReason =
	| 'syntax-error'
	| 'typo'
	| 'missing-token'
	| 'missing-comma'
	| 'unexpected-token'
	| 'unexpected-space'
	| 'unexpected-newline'
	| 'unexpected-comma'
	| 'empty-token'
	| 'out-of-range'
	| 'doesnt-exist-in-enum'
	| 'duplicated'
	| 'illegal-combination'
	| 'illegal-order'
	| 'extra-token'
	| 'must-be-percent-encoded'
	| 'must-be-serialized'
	| {
			readonly type: 'out-of-range';
			readonly gt?: number;
			readonly gte?: number;
			readonly lt?: number;
			readonly lte?: number;
	  }
	| {
			readonly type: 'out-of-range-length-char';
			readonly gte: number;
			readonly lte?: number;
	  }
	| {
			readonly type: 'out-of-range-length-digit';
			readonly gte: number;
			readonly lte?: number;
	  };

export type MatchedResult = {
	readonly matched: true;
};

export type Expect = {
	readonly type: 'const' | 'format' | 'syntax' | 'regexp' | 'common';
	readonly value: string;
};

export type FormattedPrimitiveTypeCheck = (value: string) => boolean;

export type FormattedPrimitiveTypeCreator<O = never> = (options?: O) => FormattedPrimitiveTypeCheck;

export type Defs = Readonly<Record<string, CustomCssSyntax | CustomSyntax>>;

export type CustomSyntax = {
	readonly ref: string;
	readonly expects?: readonly Expect[];
	readonly is: CustomSyntaxCheck;
};

export type CustomSyntaxCheck = (value: string) => Result;
export type CustomSyntaxChecker<O = {}> = (options?: O) => CustomSyntaxCheck;

export type CustomCssSyntax = {
	readonly ref: string;
	readonly caseSensitive?: boolean;
	readonly expects?: readonly Expect[];
	readonly syntax: {
		readonly apply: `<${string}>`;
		readonly def: Readonly<Record<string, string | CssSyntaxTokenizer>>;
		/**
		 * @deprecated
		 */
		readonly ebnf?: Readonly<Record<string, string | readonly string[]>>;
		/**
		 * @deprecated
		 */
		readonly properties?: Readonly<Record<string, string>>;
	};
};

export type CSSSyntaxToken = {
	readonly type: number;
	readonly value: string;
	readonly index: number;
	readonly balance: number;
	readonly node?: any;
};

export type CssSyntaxTokenizer = (
	token: Readonly<CSSSyntaxToken> | null,
	getNextToken: GetNextToken,
	match: typeof cssSyntaxMatch,
) => number;

export type GetNextToken = (length: number) => CSSSyntaxToken | null;
