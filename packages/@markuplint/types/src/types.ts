import type { cssSyntaxMatch } from './css-syntax';

export type { Type, List, Enum, CssSyntax, KeywordDefinedType, Number } from './types.schema';

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
			type: 'out-of-range';
			gt?: number;
			gte?: number;
			lt?: number;
			lte?: number;
	  }
	| {
			type: 'out-of-range-length-char';
			gte: number;
			lte?: number;
	  }
	| {
			type: 'out-of-range-length-digit';
			gte: number;
			lte?: number;
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

export type Defs = Record<string, CustomCssSyntax | CustomSyntax>;

export type CustomSyntax = {
	ref: string;
	expects?: Expect[];
	is: CustomSyntaxCheck;
};

export type CustomSyntaxCheck = (value: string) => Result;
export type CustomSyntaxChecker<O = {}> = (options?: O) => CustomSyntaxCheck;

export type CustomCssSyntax = {
	ref: string;
	caseSensitive?: boolean;
	expects?: Expect[];
	syntax: {
		apply: `<${string}>`;
		def: Record<string, string | CssSyntaxTokenizer>;
		/**
		 * @deprecated
		 */
		ebnf?: Record<string, string | string[]>;
		/**
		 * @deprecated
		 */
		properties?: Record<string, string>;
	};
};

export type CSSSyntaxToken = {
	type: number;
	value: string;
	index: number;
	balance: number;
	node?: any;
};

export type CssSyntaxTokenizer = (
	token: Readonly<CSSSyntaxToken> | null,
	getNextToken: GetNextToken,
	match: typeof cssSyntaxMatch,
) => number;

export type GetNextToken = (length: number) => CSSSyntaxToken | null;
