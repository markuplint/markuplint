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

function stripMarkdown(text: string): string {
	return text
		.replaceAll(/\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replaceAll('`', '')
		.replaceAll('**', '')
		.replaceAll(/(?<![\w*])[*_]+(?=\S)|(?<=\S)[*_]+(?![\w*])/g, '');
}

/**
 * Splits a quote into the passages that must all appear, in order.
 * An ellipsis (`…`, `...`, or either in brackets) marks text the author left out of the quote.
 */
export function quoteParts(quote: string): string[] {
	return foldQuotes(normalizeSpecText(stripMarkdown(quote)))
		.replaceAll(/\[\s*(?:…|\.\.\.)\s*\]/g, '…')
		.split(/…|\.\.\./)
		.map(part => normalizeSpecText(part))
		.filter(part => part !== '');
}

/**
 * Whether every passage of `quote` occurs in `scope`, in order.
 *
 * The comparison ignores case, as a text fragment does: a quote that opens
 * mid-sentence is routinely capitalized, and that is not a change of the spec.
 */
export function containsQuote(scope: string, quote: string): boolean {
	const parts = quoteParts(quote);
	if (parts.length === 0) {
		return false;
	}
	const haystack = foldQuotes(normalizeSpecText(scope)).toLowerCase();
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
