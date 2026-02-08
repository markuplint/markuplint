/**
 * A function that translates message templates or formats keyword lists
 * according to a bound locale set.
 *
 * Overloads:
 * 1. Translate a message template with keyword interpolation.
 * 2. Format a list of keywords into a human-readable string.
 * 3. Combined signature accepting either form.
 */
export interface Translator {
	/**
	 * Translates a message template by interpolating keywords.
	 *
	 * @param messageTmpl - The message template with `{0}`, `{1}`, ... placeholders
	 * @param keywords - Values to substitute into the template
	 * @returns The translated, interpolated message string
	 */
	(messageTmpl: string, ...keywords: readonly Primitive[]): string;
	/**
	 * Formats a list of keywords into a localized, human-readable string.
	 *
	 * @param messageTmpl - An array of keywords to format as a list
	 * @param useLastSeparator - Whether to use the "last separator" (e.g. " and ") before the final item
	 * @returns The formatted list string
	 */
	(messageTmpl: readonly string[], useLastSeparator?: boolean): string;
	/**
	 * Combined overload accepting either a message template string or a keyword list.
	 *
	 * @param messageTmpl - A message template string or an array of keywords
	 * @param keywords - Values to substitute (when a string template is provided)
	 * @returns The translated or formatted string
	 */
	(messageTmpl: string | readonly string[], ...keywords: readonly Primitive[]): string;
}

/**
 * Configuration for a specific locale, including translations and formatting rules.
 */
export type LocaleSet = {
	/** The locale identifier (e.g. `"en"`, `"ja"`) */
	readonly locale: string;
	/** Formatting rules for rendering keyword lists */
	readonly listFormat?: ListFormat;
	/** A dictionary mapping lowercase keywords to their translations */
	readonly keywords?: LocalesKeywords;
	/** A dictionary mapping lowercase sentence templates to their translations */
	readonly sentences?: LocalesKeywords;
};

/**
 * Formatting rules for rendering a list of items as a human-readable string.
 */
export type ListFormat = {
	/** Character(s) placed before each quoted item (e.g. `"`) */
	readonly quoteStart: string;
	/** Character(s) placed after each quoted item (e.g. `"`) */
	readonly quoteEnd: string;
	/** Separator between items (e.g. `", "`) */
	readonly separator: string;
	/** Separator before the last item (e.g. `" and "`); falls back to `separator` if omitted */
	readonly lastSeparator?: string;
};

/**
 * A primitive value type used as a keyword in translations.
 */
export type Primitive = string | number | boolean;

/**
 * A dictionary mapping message IDs (lowercase) to their translated strings.
 */
export type LocalesKeywords = {
	readonly [messageId: string]: string;
};
