import type { cssSyntaxMatch } from './css-syntax';

export type { Type, List, Enum, CssSyntax, KeywordDefinedType, Number } from './types.schema';

export type Result = UnmatchedResult | MatchedResult;

export type UnmatchedResult = {
	matched: false;
	ref: string | null;
	raw: string;
	length: number;
	offset: number;
	line: number;
	column: number;
	reason: UnmatchedResultReason;
	passCount?: number;
} & UnmatchedResultOptions;

export type UnmatchedResultOptions = {
	partName?: string;
	expects?: Expect[];
	extra?: Expect;
	candicate?: string;
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
	matched: true;
};

export type Expect = {
	type: 'const' | 'format' | 'syntax' | 'regxp' | 'common';
	value: string;
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
	token: CSSSyntaxToken | null,
	getNextToken: GetNextToken,
	match: typeof cssSyntaxMatch,
) => number;

export type GetNextToken = (length: number) => CSSSyntaxToken | null;
