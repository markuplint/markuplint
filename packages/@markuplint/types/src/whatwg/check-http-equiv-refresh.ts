import type { CustomSyntaxChecker } from '../types.js';

import { log } from '../debug.js';
import { matched, unmatched } from '../match-result.js';
import { checkURL } from './check-url.js';

// `ASCII whitespace` per Infra: TAB, LF, FF, CR, SPACE.
// https://infra.spec.whatwg.org/#ascii-whitespace
const ASCII_WHITESPACE = /[\t\n\f\r ]/;
// `ASCII digit` per Infra. `\d` happens to match the same set today in
// JavaScript regexes, but the HTML LS grammar is specific to U+0030–U+0039,
// so we pin the class to that range to protect against accidental Unicode
// broadening if the `u` flag or a future regex flavour drifts it.
// oxlint: use-the-regex-literal-shorthand warns on `[0-9]`; suppress here so
// the spec intent survives auto-fix passes.
// eslint-disable-next-line regexp/prefer-d
const ASCII_DIGIT = /[0-9]/;

function isAsciiWhitespace(ch: string): boolean {
	return ASCII_WHITESPACE.test(ch);
}

function isAsciiDigit(ch: string): boolean {
	return ASCII_DIGIT.test(ch);
}

/**
 * Validates the `content` attribute value of `<meta http-equiv="refresh">`
 * against the HTML Living Standard §4.2.5.3 "Refresh" conformance grammar.
 *
 * The grammar (distinct from the more lenient parse algorithm browsers use
 * to execute the refresh):
 *
 * 1. Optionally, ASCII whitespace.
 * 2. A valid non-negative integer.
 * 3. Optionally:
 *    1. Either a ";" (U+003B) or a "," (U+002C).
 *    2. Optionally, ASCII whitespace.
 *    3. Either:
 *       - An ASCII case-insensitive match for "URL", followed by "=",
 *         followed by a valid URL potentially surrounded by spaces.
 *       - A valid URL potentially surrounded by spaces.
 *
 * @see https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv-refresh
 */
export const checkHTTPEquivRefresh: CustomSyntaxChecker = () =>
	function checkHTTPEquivRefresh(value) {
		log('CHECK: meta http-equiv="refresh" content');

		let i = 0;
		const len = value.length;

		// 1. Optional leading ASCII whitespace.
		while (i < len && isAsciiWhitespace(value[i]!)) i++;

		// 2. Required: a valid non-negative integer.
		const digitStart = i;
		while (i < len && isAsciiDigit(value[i]!)) i++;
		if (digitStart === i) {
			return unmatched(value, 'syntax-error', {
				expects: [{ type: 'format', value: 'non-negative integer' }],
			});
		}

		// No clause-3 block: the remainder of the string must be empty.
		if (i === len) return matched();

		// 3.1 Required separator ";" or ",". Whitespace alone does not open
		// the optional clause — the conformance text names the punctuation
		// explicitly, and refusing bare whitespace is how we catch the
		// `refresh-missing-semicolon` fixture.
		const sep = value[i];
		if (sep !== ';' && sep !== ',') {
			return unmatched(value, 'unexpected-token', {
				expects: [
					{ type: 'const', value: ';' },
					{ type: 'const', value: ',' },
				],
			});
		}
		i++;

		// 3.2 Optional ASCII whitespace.
		while (i < len && isAsciiWhitespace(value[i]!)) i++;

		// 3.3 URL part — either "URL=<url>" (case-insensitive) or a bare URL.
		if (i === len) {
			// Clause 3 was opened by the separator but clause 3.3 is
			// missing. A trailing `;` with nothing after breaks the grammar.
			return unmatched(value, 'missing-token', {
				expects: [{ type: 'common', value: 'URL' }],
			});
		}

		const rest = value.slice(i);
		let urlStr: string;
		if (rest.length >= 4 && rest.slice(0, 3).toLowerCase() === 'url' && rest[3] === '=') {
			urlStr = rest.slice(4);
		} else {
			// Fall back to the bare-URL alternative. If the tail begins with
			// something that looks like a keyword but is not "URL=" (e.g.,
			// `href=...`), HTML LS still accepts it as long as the full tail
			// parses as a valid URL — a relative-URL string with "=" in its
			// path is legal per URL LS. That is why nu-validator's
			// `refresh-invalid-keyword` over-detection is not a markuplint
			// gap; see `snapshots/excluded-ids.json`.
			urlStr = rest;
		}

		const urlResult = checkURL()(urlStr);
		if (!urlResult.matched) {
			return unmatched(value, urlResult.reason, {
				expects: [{ type: 'common', value: 'URL' }],
			});
		}

		return matched();
	};
