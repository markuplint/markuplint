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
 * A passage a rule quotes from a specification, from a page of the documentation of a framework, or from a
 * declaration of its source.
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

/**
 * One URL of a specification, of the documentation of a framework, or of a source file of a framework, written in
 * a README, a source comment or a data file.
 */
export type Citation = {
	/** Repository-relative path, with `/` separators on every platform. */
	readonly file: string;
	/** 1-based line of the URL. */
	readonly line: number;
	/** The URL as written, without the Markdown or comment wrapping around it. */
	readonly url: string;
	/**
	 * The URL that is fetched: `url` without its fragment and text directive. For a link to a source file of a
	 * framework it is the URL of the raw file (`raw.githubusercontent.com`), which `url` is not.
	 */
	readonly page: string;
	/**
	 * Decoded fragment without the text directive; `null` for a whole-page link. For a source file it is the name
	 * of a declaration in it, and `null` for a line range (`#L11-L52`).
	 */
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

/** What extracting one fragment from a page, or one declaration from a source file, yields. */
export type Section =
	| {
			readonly status: 'found';
			/** The smallest unit that is hashed: a paragraph, an algorithm, a heading's own prose, a declaration. */
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
	/** `html` is the text that was fetched: the HTML of a page, or the text of a source file. */
	| { readonly status: 'ok'; readonly html: string }
	| {
			readonly status: 'failed';
			readonly message: string;
			/** The page is gone (404, 410), not unreachable for now: a finding, not something to try again. */
			readonly permanent?: boolean;
	  };

export type ProblemKind =
	| 'unprocessed-source'
	| 'page-missing'
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
