/**
 * Reading the `auto` keyword of a `<source-size-list>` (HTML LS § sizes
 * attributes) as CSS tokens, the way the grammar reads it.
 *
 * The grammar is matched by css-tree, which compares a keyword with the
 * source text of an `<ident-token>` and does not decode its escapes, while CSS
 * Syntax reads `\61 uto`, `a\75 to` and `\41 UTO` as the ident `auto`
 * (ASCII case-insensitively for a keyword).
 *
 * @see https://html.spec.whatwg.org/multipage/images.html#sizes-attributes
 * @see https://drafts.csswg.org/css-syntax-3/#consume-escaped-code-point
 */

import { ident, tokenize, tokenTypes } from 'css-tree';

/**
 * Whether the source text of an `<ident-token>` is the keyword `auto`: its
 * escapes decoded, then compared ASCII case-insensitively.
 *
 * @param raw - The source text of an `<ident-token>`
 * @returns `true` if it is `auto`
 */
function isAutoIdent(raw: string): boolean {
	return ident.decode(raw).replaceAll(/[A-Z]/gu, c => c.toLowerCase()) === 'auto';
}

type CssToken = {
	readonly type: number;
	readonly start: number;
	readonly end: number;
};

function tokens(value: string): CssToken[] {
	const list: CssToken[] = [];
	tokenize(value, (type, start, end) => {
		list.push({ type, start, end });
	});
	return list;
}

/**
 * Whether a `sizes` attribute value specifies the `auto` keyword: the first
 * entry of the `<source-size-list>` is the keyword alone.
 *
 * The grammar puts `auto` only at the start of the list, so only the first
 * entry is read; `auto` anywhere else is a syntax error of the value, which
 * the `SourceSizeList` type reports. Comments and whitespace around the
 * keyword are allowed by the grammar, and an escaped ident is the keyword
 * when it decodes to `auto`:
 *
 * > A source element's sizes attribute has no such restriction, so comments
 * > and whitespace are allowed around auto there as permitted by the
 * > <source-size-list> grammar.
 *
 * This is the grammar's reading: an `img`
 * element's `sizes` also has to have the keyword in a literal form, which
 * this function does not check.
 *
 * @param value - The raw `sizes` attribute value
 * @returns `true` if the first entry is the keyword `auto`
 * @see https://html.spec.whatwg.org/multipage/images.html#sizes-attributes
 */
export function specifiesSourceSizeAuto(value: string): boolean {
	return findSourceSizeAuto(value) !== null;
}

/**
 * Find the `auto` keyword that is the first entry of a `<source-size-list>`
 * (see `specifiesSourceSizeAuto`).
 *
 * @param value - The raw `sizes` attribute value
 * @returns The offsets of the keyword's source text, or `null` when the first
 *   entry is not the keyword `auto`
 */
export function findSourceSizeAuto(value: string): { readonly start: number; readonly end: number } | null {
	const significant = tokens(value).filter(t => t.type !== tokenTypes.WhiteSpace && t.type !== tokenTypes.Comment);
	const first = significant[0];
	if (first?.type !== tokenTypes.Ident || !isAutoIdent(value.slice(first.start, first.end))) {
		return null;
	}
	const next = significant[1];
	return next === undefined || next.type === tokenTypes.Comma ? { start: first.start, end: first.end } : null;
}

/**
 * Rewrite every `<ident-token>` that is the keyword `auto` only by its escapes
 * as the literal `auto`, padded with spaces to the length of its source text,
 * so that css-tree, which does not decode escapes, matches it as the keyword
 * and every offset into the value stays where it was. An `<ident-token>` is
 * never directly followed by `(` (that is a `<function-token>`), so the
 * padding only adds whitespace between tokens.
 *
 * @param value - The raw `sizes` attribute value
 * @returns The value with each escaped `auto` written literally
 */
export function unescapeSourceSizeAuto(value: string): string {
	let result = '';
	let last = 0;
	for (const t of tokens(value)) {
		if (t.type !== tokenTypes.Ident) {
			continue;
		}
		const raw = value.slice(t.start, t.end);
		if (!raw.includes('\\') || !isAutoIdent(raw)) {
			continue;
		}
		result += value.slice(last, t.start) + 'auto'.padEnd(raw.length, ' ');
		last = t.end;
	}
	return result + value.slice(last);
}
