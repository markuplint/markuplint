import type { TextDirective } from './types.ts';

import { createHash } from 'node:crypto';

// Ideographic and full-width punctuation is spelled out rather than given as a range of code points.
const CJK_PUNCTUATION = '　、。，．：；！？「」『』（）［］｛｝〈〉《》【】〔〕〜～・';
const CJK = String.raw`\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}${CJK_PUNCTUATION}`;
const SPACE_NEXT_TO_CJK = new RegExp(String.raw`\s+(?=[${CJK}])|(?<=[${CJK}])\s+`, 'gu');

/**
 * Normalizes spec text so the same passage compares equal across renderings.
 *
 * Whitespace around Japanese characters is dropped, not collapsed: the
 * translation at momdo.github.io keeps source line breaks and inline-element
 * boundaries inside sentences, which would otherwise show up as spaces that
 * the README quote does not have.
 */
export function normalizeSpecText(text: string): string {
	return text.replaceAll(' ', ' ').replaceAll(/\s+/g, ' ').trim().replaceAll(SPACE_NEXT_TO_CJK, '');
}

/**
 * Folds what differs between how a passage is written and how the page's text
 * reads: curly quotes, and the colon that a spec stylesheet draws after a list
 * term (`dt::after`) and so is in a copy from the rendered page but not in the
 * DOM. Both sides are folded, so a colon that is in the source text matches too.
 */
function foldQuotes(text: string): string {
	return text
		.replaceAll(/[‘’]/g, "'")
		.replaceAll(/[“”]/g, '"')
		.replaceAll(/:(?=\s|$)/g, '');
}

/**
 * Strips what Markdown draws around a quote: a link's target, code ticks, and the pair of markers that opens and
 * closes an emphasis (`*this*`, `_this_`, `__this__`). An asterisk or an underscore that closes nothing is the
 * spec's own character and stays: `"_blank"`, `(_)` and `"*"` are in the page's text, and stripped from the quote
 * they would never match it. A pair that is the spec's own (`__proto__`, `_private_`) cannot be told from an
 * emphasis by its shape, so `containsQuote` also tries the quote with the pairs kept (`emphasis` false).
 */
function stripMarkdown(text: string, emphasis = true): string {
	const alnum = String.raw`\p{L}\p{N}`;
	const pair = new RegExp(
		String.raw`(?<![${alnum}_*])([*_]+)([${alnum}](?:[\s\S]*?[${alnum}])?)\1(?![${alnum}_*])`,
		'gu',
	);
	return text
		.replaceAll(/\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replaceAll('`', '')
		.replaceAll('**', emphasis ? '' : '**')
		.replaceAll(pair, emphasis ? '$2' : '$&');
}

/**
 * Splits a quote into the passages that must all appear, in order.
 * An ellipsis (`…`, `...`, or either in brackets) marks text the author left out of the quote.
 */
export function quoteParts(quote: string, emphasis = true): string[] {
	return foldQuotes(normalizeSpecText(stripMarkdown(quote, emphasis)))
		.replaceAll(/\[\s*(?:…|\.\.\.)\s*\]/g, '…')
		.split(/…|\.\.\./)
		.map(part => normalizeSpecText(part))
		.filter(part => part !== '');
}

/**
 * Whether every passage of `quote` occurs in `scope`, in order.
 *
 * The comparison ignores case, as a text fragment does: a quote that opens
 * mid-sentence is routinely capitalized, and that is not a change of the spec. A quote is tried with a pair of
 * `_` or `*` read as Markdown emphasis, and as the spec's own characters (`__proto__`).
 */
export function containsQuote(scope: string, quote: string): boolean {
	const haystack = foldQuotes(normalizeSpecText(scope)).toLowerCase();
	return [true, false].some(emphasis => containsParts(haystack, quoteParts(quote, emphasis)));
}

function containsParts(haystack: string, parts: readonly string[]): boolean {
	if (parts.length === 0) {
		return false;
	}
	let from = 0;
	for (const part of parts) {
		const at = haystack.indexOf(part.toLowerCase(), from);
		if (at === -1) {
			return false;
		}
		from = at + part.length;
	}
	return true;
}

function fold(text: string): string {
	return foldQuotes(normalizeSpecText(text)).toLowerCase();
}

/**
 * Whether a `:~:text=` directive matches the text of a page, as a browser matches it: the start
 * is found with the prefix just before it, the end is found after the start, and the suffix
 * follows the match. Case is ignored, as the Text Fragments spec does.
 *
 * @see https://wicg.github.io/scroll-to-text-fragment/#text-fragments
 */
export function matchesDirective(page: string, directive: TextDirective): boolean {
	const haystack = fold(page);
	const start = fold(directive.start);
	if (start === '') {
		return false;
	}
	const prefix = directive.prefix === undefined ? undefined : fold(directive.prefix);
	const end = directive.end === undefined ? undefined : fold(directive.end);
	const suffix = directive.suffix === undefined ? undefined : fold(directive.suffix);
	// Whitespace is collapsed to single spaces, so a little slack around a context string is enough.
	const slack = 16;
	for (let at = haystack.indexOf(start); at !== -1; at = haystack.indexOf(start, at + 1)) {
		if (
			prefix !== undefined &&
			!haystack
				.slice(Math.max(0, at - prefix.length - slack), at)
				.trimEnd()
				.endsWith(prefix)
		) {
			continue;
		}
		let to = at + start.length;
		if (end !== undefined) {
			const endAt = haystack.indexOf(end, to);
			if (endAt === -1) {
				continue;
			}
			to = endAt + end.length;
		}
		if (
			suffix !== undefined &&
			!haystack
				.slice(to, to + suffix.length + slack)
				.trimStart()
				.startsWith(suffix)
		) {
			continue;
		}
		return true;
	}
	return false;
}

export function hashText(text: string): string {
	return createHash('sha256').update(text).digest('hex');
}
