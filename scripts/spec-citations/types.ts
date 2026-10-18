/**
 * A `:~:text=` directive (https://wicg.github.io/scroll-to-text-fragment/):
 * `[prefix-,]start[,end][,-suffix]`, already percent-decoded.
 */
export type TextDirective = {
	readonly prefix?: string;
	readonly start: string;
	readonly end?: string;
	readonly suffix?: string;
};

/**
 * A passage a rule quotes from a specification.
 *
 * `group` ties together the quotes that may be satisfied by any one of several
 * cited sections: a JSDoc block that cites two URLs does not say which URL a
 * given `>` line comes from, so the quote passes when it is found in any of them.
 */
export type Quote = {
	readonly text: string;
	readonly file: string;
	readonly line: number;
	readonly group: string;
};

/** One specification URL written in a README, a source comment or a data file. */
export type Citation = {
	/** Repository-relative path, with `/` separators on every platform. */
	readonly file: string;
	/** 1-based line of the URL. */
	readonly line: number;
	/** The URL as written, without the Markdown or comment wrapping around it. */
	readonly url: string;
	/** The URL without its fragment and text directive. */
	readonly page: string;
	/** Decoded fragment without the text directive; `null` for a whole-page link. */
	readonly fragment: string | null;
	readonly textDirective: TextDirective | null;
	/** Section number written beside the URL (`4.10.5.1.17`), or `null`. */
	readonly secno: string | null;
	readonly quotes: readonly Quote[];
};

export type CollectResult = {
	readonly citations: readonly Citation[];
	/** Blockquotes with no spec link before or after them. */
	readonly orphanQuotes: readonly Quote[];
	/** Double-quoted spec sentences in a source comment (must be written as `>` lines instead). */
	readonly inlineQuotes: readonly Quote[];
};

/** What extracting one fragment from a page yields. */
export type Section =
	| {
			readonly status: 'found';
			/** The smallest unit that is hashed: a paragraph, an algorithm, a heading's own prose. */
			readonly unit: string;
			/** The unit plus its subsections; quotes are looked up here. */
			readonly scope: string;
			/** Section number of the enclosing heading, when the page numbers its headings. */
			readonly secno: string | null;
	  }
	| { readonly status: 'missing' };

export type LockEntry = {
	readonly hash: string;
	readonly text: string;
	readonly updatedAt: string;
};

export type Lock = {
	readonly sections: Readonly<Record<string, LockEntry>>;
};

export type PageResult =
	| { readonly status: 'ok'; readonly html: string }
	| { readonly status: 'failed'; readonly message: string };

export type ProblemKind =
	| 'unprocessed-source'
	| 'anchor-missing'
	| 'anchor-empty'
	| 'quote-mismatch'
	| 'orphan-quote'
	| 'inline-quote'
	| 'no-fragment'
	| 'directive-missing'
	| 'secno-stale'
	| 'section-changed'
	| 'fetch-failed';

export type Problem = {
	readonly kind: ProblemKind;
	readonly citation: Citation | null;
	readonly message: string;
	/** Unified diff of the stored and the current text (`section-changed` only). */
	readonly diff?: string;
	readonly quote?: Quote;
};
