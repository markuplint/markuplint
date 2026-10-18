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

/** Case-insensitive containment of already-decoded text, as a `:~:text=` directive matches. */
export function containsText(haystack: string, needle: string): boolean {
	const n = foldQuotes(normalizeSpecText(needle)).toLowerCase();
	return n !== '' && foldQuotes(normalizeSpecText(haystack)).toLowerCase().includes(n);
}

export function hashText(text: string): string {
	return createHash('sha256').update(text).digest('hex');
}
