import type { CustomSyntaxChecker } from '../types.js';

import { log } from '../debug.js';
import { matched, unmatched } from '../match-result.js';

// cspell:ignore FDEF FFFE XFFFE XFFFF AFFFE AFFFF BFFFE BFFFF CFFFE CFFFF DFFFE DFFFF EFFFE EFFFF FFFFE FFFFF

/**
 * Dummy base URL for resolving relative URLs.
 * Used only for syntax validation — the actual base URL is irrelevant.
 * Matches the approach used by nu-html-checker (galimatias).
 */
const DUMMY_BASE = 'http://example.org/foo/bar';

/**
 * Pattern: a URL whose scheme is one of the special schemes (case-insensitive).
 *
 * Special schemes per URL Living Standard §3.5: `ftp`, `file`, `http`,
 * `https`, `ws`, `wss`.
 *
 * @see https://url.spec.whatwg.org/#special-scheme
 */
const SPECIAL_SCHEME_PREFIX = /^(?:ftp|file|https?|wss?):/i;

/**
 * Pattern: a special-scheme URL that is **not** followed by `//`.
 *
 * Triggers `special-scheme-missing-following-solidus` for `ftp`/`http`/`https`/`ws`/`wss`
 * (and the file-scheme variant for `file:`).
 *
 * Examples that match: `http:foo`, `https:/foo`, `file:foo`, `file:/foo`.
 *
 * @see https://url.spec.whatwg.org/#special-scheme-missing-following-solidus
 * @see https://url.spec.whatwg.org/#file-scheme-missing-following-solidus
 */
const SPECIAL_SCHEME_MISSING_SOLIDUS = /^(?:ftp|file|https?|wss?):(?!\/\/)/i;

/**
 * Pattern: a special-scheme URL with a single slash where two are required.
 *
 * Examples that match: `http:/foo`, `file:/C:/foo`.
 *
 * Combined with `SPECIAL_SCHEME_MISSING_SOLIDUS`, this also rejects the
 * `file:/single-slash` form even though `file:/` is **not** caught by the
 * "missing following solidus" rule alone (the parser tolerates exactly one
 * solidus before transitioning into the file slash state — but nu-validator
 * reports it as a validation error against the strict "valid URL string"
 * production).
 *
 * @see https://url.spec.whatwg.org/#file-scheme-missing-following-solidus
 */
const SPECIAL_SCHEME_SINGLE_SLASH = /^(?:ftp|file|https?|wss?):\/(?!\/)/i;

/**
 * Pattern: special-scheme URL (or scheme-relative URL) whose authority
 * component contains an `@` sign — i.e., the URL declares userinfo even
 * when that userinfo is empty (`http://@host`).
 *
 * URL LS reports `invalid-credentials` whenever the input has an `@` in
 * the authority, regardless of whether `username`/`password` are non-empty
 * after parsing. The post-parse `parsed.username/password` check below
 * does not catch the empty-userinfo variant on its own, so we surface it
 * here on the raw input.
 *
 * @see https://url.spec.whatwg.org/#invalid-credentials
 */
const SPECIAL_SCHEME_AUTHORITY_HAS_AT_SIGN = /^(?:(?:ftp|file|https?|wss?):)?\/\/[^/?#]*@/i;

/**
 * Pattern: more than one `#` in the URL.
 *
 * URL LS treats the first `#` as the fragment delimiter; any subsequent
 * `#` is auto-percent-encoded by `new URL()` but reported as
 * `invalid-URL-unit` because `#` is not a URL code point inside the
 * fragment grammar of a "valid URL string".
 *
 * Example caught: `http://example.com/path#f#g`.
 *
 * The regex has no `s` flag, so `.` does not match a newline. This is
 * deliberate and depends on `ILLEGAL_WHITESPACE` (TAB/LF/CR) running
 * earlier in `checkURL` — a `#…\n…#` input is already rejected before
 * this regex is consulted. If you reorder the checks in `checkURL`, add
 * the `s` flag here.
 *
 * @see https://url.spec.whatwg.org/#invalid-url-unit
 */
const MULTIPLE_HASH = /#.*#/;

/**
 * Pattern: a URL whose path / query / fragment contains `[` or `]`.
 *
 * Square brackets are URL code points **only** in the host position of a
 * special-scheme URL, where they delimit an IPv6 address (e.g.,
 * `http://[::1]/`). Outside the authority component they are not URL code
 * points and trigger `invalid-URL-unit`.
 *
 * Detection: strip the authority portion (everything between `://` and the
 * first `/`/`?`/`#`) and check the remainder for any `[` or `]`. Relative
 * URLs without `://` are checked as-is.
 *
 * Examples caught:
 * - `[61:24:74]:98` — relative URL with IPv6-looking brackets in path
 * - `http://example.com/path[a]` — brackets in path of special-scheme URL
 * - `data:[foo]` — brackets in opaque path of non-special scheme
 *
 * @see https://url.spec.whatwg.org/#invalid-url-unit
 * @see https://url.spec.whatwg.org/#url-code-points
 */
function hasBracketsOutsideHost(value: string): boolean {
	if (!/[[\]]/.test(value)) {
		return false;
	}
	// Strip the authority component (host[:port][@userinfo]) if present.
	// The optional scheme prefix matches both special and non-special schemes;
	// the `[^/?#]*` swallows everything up to the first path/query/fragment
	// delimiter, which includes a legitimate `[::1]` IPv6 host.
	const withoutAuthority = value.replace(/^(?:[a-z][a-z0-9+.-]*:)?\/\/[^/?#]*/i, '');
	return /[[\]]/.test(withoutAuthority);
}

/**
 * Pattern: a `data:` URL with no `,` separator.
 *
 * RFC 2397 requires the form `data:[<mediatype>][;base64],<data>`; the
 * `,` is mandatory. `data:` URLs without a comma (e.g., `data:/example.com/`,
 * `data:`) are syntactically invalid even though `URL.canParse` accepts them
 * as opaque-path non-special-scheme URLs.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc2397
 */
const DATA_URL_MISSING_COMMA = /^data:[^,]*$/i;

/**
 * Pattern: file-scheme URL with a Windows drive letter that uses `|` instead of `:`.
 *
 * URL LS §6 says `C|` is auto-corrected to `C:` and triggers a
 * `file-invalid-Windows-drive-letter` validation error. nu-validator surfaces
 * this and so do we.
 *
 * Matches `file:C|...`, `file:/C|...`, `file://C|...`, `file:///C|...`, etc.
 *
 * @see https://url.spec.whatwg.org/#file-invalid-windows-drive-letter
 */
const FILE_WINDOWS_DRIVE_LETTER_WITH_BAR = /^file:\/{0,3}[a-z]\|/i;

/**
 * Characters that are illegal in URLs per WHATWG URL Standard.
 * Tabs and newlines are stripped during parsing but are validation errors.
 *
 * @see https://url.spec.whatwg.org/#url-code-points
 */
// eslint-disable-next-line no-control-regex
const ILLEGAL_WHITESPACE = /[\t\n\r]/;

/**
 * Malformed percent-encoding: `%` not followed by exactly two hex digits.
 */
const MALFORMED_PERCENT = /%(?![0-9A-F]{2})/i;

/**
 * Forbidden code points per HTML Living Standard and URL spec.
 *
 * Covers:
 * - C0 controls (U+0000–U+001F) except TAB/LF/CR which are caught by
 *   ILLEGAL_WHITESPACE
 * - DEL (U+007F) and C1 controls (U+0080–U+009F)
 * - Unicode noncharacters:
 *   - BMP: U+FDD0–U+FDEF, U+FFFE, U+FFFF
 *   - Supplementary planes: U+XFFFE / U+XFFFF for X = 1..10 (hex)
 *
 * Requires the `u` flag for code points above U+FFFF.
 *
 * @see https://infra.spec.whatwg.org/#noncharacter
 * @see https://html.spec.whatwg.org/multipage/parsing.html#preprocessing-the-input-stream
 */
const FORBIDDEN_CODE_POINT =
	// eslint-disable-next-line no-control-regex
	/[\u0000-\u0008\v\u000E-\u001F\u007F-\u009F\uFDD0-\uFDEF\uFFFE\uFFFF\u{1FFFE}\u{1FFFF}\u{2FFFE}\u{2FFFF}\u{3FFFE}\u{3FFFF}\u{4FFFE}\u{4FFFF}\u{5FFFE}\u{5FFFF}\u{6FFFE}\u{6FFFF}\u{7FFFE}\u{7FFFF}\u{8FFFE}\u{8FFFF}\u{9FFFE}\u{9FFFF}\u{AFFFE}\u{AFFFF}\u{BFFFE}\u{BFFFF}\u{CFFFE}\u{CFFFF}\u{DFFFE}\u{DFFFF}\u{EFFFE}\u{EFFFF}\u{FFFFE}\u{FFFFF}\u{10FFFE}\u{10FFFF}]/u;

/**
 * Strips only HTML ASCII whitespace (TAB/LF/FF/CR/SPACE) from both ends.
 *
 * Unlike `String.prototype.trim()`, this does not strip U+000B (vertical tab)
 * or any other Unicode whitespace, so forbidden code points at URL
 * boundaries are preserved for the forbidden-code-point check below.
 *
 * @see https://infra.spec.whatwg.org/#strip-leading-and-trailing-ascii-whitespace
 */
function stripAsciiWhitespace(value: string): string {
	return value.replaceAll(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, '');
}

/**
 * Unencoded space in URL body (after trimming leading/trailing spaces).
 * `new URL()` accepts spaces by percent-encoding them, but the WHATWG spec
 * considers them a validation error. nu-validator rejects them.
 */
const UNENCODED_SPACE = / /;

/**
 * Pattern: a dot-separated host label written in hex (`0x…`/`0X…`) or
 * leading-zero octal notation (a `0` immediately followed by another digit).
 *
 * The URL Standard's IPv4 number parser sets `validationError` to true for
 * either form even though the number still parses successfully — `new URL()`
 * silently normalizes such labels to plain decimal (e.g. `192.0x00A80001` →
 * `192.168.0.1`), so this must be tested against the pre-normalization host.
 *
 * @see https://url.spec.whatwg.org/#ipv4-number-parser
 */
const IPV4_NON_DECIMAL_PART = /^0(?:[x][0-9a-f]*|\d+)$/i;

/**
 * Pattern: a host label that "ends in a number" per the URL Standard —
 * either plain ASCII digits, or a `0x`/`0X`-prefixed hex run (which is
 * still a number, just written non-decimally).
 *
 * Gates {@link hasIPv4NonDecimalPart} so it never fires on an ordinary
 * domain (`example.com`) merely because an earlier label happens to
 * contain digits — the IPv4 parser only runs when the domain's last
 * label looks numeric in the first place.
 *
 * @see https://url.spec.whatwg.org/#ends-in-a-number-checker
 */
const IPV4_LAST_PART_NUMERIC = /^(?:\d+|0[x][0-9a-f]*)$/i;

/**
 * Extracts the raw (pre-percent-decode, pre-IDNA) host component from a
 * special-scheme or scheme-relative URL's authority, or `null` when there
 * is no authority to extract (non-special scheme, or a relative URL with
 * no `//`) or the host is an IPv6 literal (`[::1]`, never IPv4-parsed).
 */
function extractRawHost(trimmed: string): string | null {
	const authorityMatch = /^(?:[a-z][a-z0-9+.-]*:)?\/\/([^/?#]*)/i.exec(trimmed);
	if (!authorityMatch) {
		return null;
	}
	const authority = authorityMatch[1] ?? '';
	const host = authority.includes('@') ? authority.slice(authority.lastIndexOf('@') + 1) : authority;
	if (host === '' || host.startsWith('[')) {
		return null;
	}
	const portIndex = host.indexOf(':');
	return portIndex === -1 ? host : host.slice(0, portIndex);
}

/**
 * Detects an `IPv4-non-decimal-part` validation error on a special-scheme
 * URL's host, before `new URL()` normalizes it away.
 *
 * Mirrors the URL Standard's host parser preprocessing (percent-decode,
 * then the Unicode mapping IDNA's "domain to ASCII" step performs — here
 * approximated with `String.prototype.normalize('NFKC')`, which folds
 * fullwidth digits/letters to their ASCII equivalents) before splitting on
 * `.` and testing each label. `IPV4_LAST_PART_NUMERIC` gates the whole
 * check on the domain "ending in a number", matching the spec's own gate
 * for whether the IPv4 parser runs at all.
 *
 * @see https://url.spec.whatwg.org/#concept-host-parser
 * @see https://url.spec.whatwg.org/#concept-ipv4-parser
 */
function hasIPv4NonDecimalPart(trimmed: string): boolean {
	const rawHost = extractRawHost(trimmed);
	if (rawHost == null) {
		return false;
	}

	let host: string;
	try {
		host = decodeURIComponent(rawHost).normalize('NFKC');
	} catch {
		return false;
	}

	let labels = host.split('.');
	if (labels.length > 1 && labels.at(-1) === '') {
		labels = labels.slice(0, -1);
	}

	const lastLabel = labels.at(-1) ?? '';
	if (!IPV4_LAST_PART_NUMERIC.test(lastLabel)) {
		return false;
	}

	return labels.some(label => IPV4_NON_DECIMAL_PART.test(label));
}

/**
 * Returns `true` when `value` should be treated as a special-scheme URL —
 * either it has an explicit special scheme prefix, or it is scheme-relative
 * (no scheme, so it inherits the document's base URL, which in HTML attribute
 * context is overwhelmingly a special-scheme URL).
 *
 * Used to gate validations that are only meaningful for special schemes
 * (e.g., backslash → invalid-reverse-solidus).
 *
 * @see https://url.spec.whatwg.org/#special-url
 */
function isSpecialOrSchemeless(value: string): boolean {
	if (SPECIAL_SCHEME_PREFIX.test(value)) {
		return true;
	}
	// A URL that starts with a non-special scheme like `mailto:`, `data:`,
	// `javascript:`, `tel:`, etc. is not a special URL.
	// We only need to detect the absence of a scheme; the explicit
	// non-special-scheme cases are handled by the negative match here.
	return !/^[a-z][a-z0-9+.-]*:/i.test(value);
}

/**
 * Validates a URL string (potentially surrounded by spaces) per the WHATWG
 * URL Standard. Accepts both absolute and relative URLs.
 *
 * Uses `new URL()` for structural parsing and surfaces the validation errors
 * that `new URL()` silently accepts but nu-validator (and the URL LS) report.
 *
 * Categories caught:
 *
 * - **invalid-URL-unit** (forbidden code points, malformed percent-encoding,
 *   unencoded space, tab/CR/LF)
 * - **invalid-reverse-solidus** (`\` in a special-scheme URL)
 * - **special-scheme-missing-following-solidus** (`http:foo`, `file:bar`)
 *   and `file-scheme-missing-following-solidus` / single-slash variants
 * - **file-invalid-Windows-drive-letter** (`file:///C|/foo`)
 * - **invalid-credentials** (`http://user:pass@example.com`)
 * - **IPv4-non-decimal-part** (`http://192.0x00A80001`, hex/octal host labels)
 * - any URL that fails `new URL()` parsing (even with a dummy base)
 *
 * @see https://html.spec.whatwg.org/multipage/urls-and-fetching.html#valid-url-potentially-surrounded-by-spaces
 * @see https://url.spec.whatwg.org/#url-parsing
 */
export const checkURL: CustomSyntaxChecker = () =>
	function checkURL(value) {
		log('CHECK: url');

		const trimmed = stripAsciiWhitespace(value);

		// Empty URL is valid for some attributes (e.g., <a href="">)
		// The spec says "valid URL potentially surrounded by spaces"
		// and the empty string resolves to the document's URL.
		if (trimmed === '') {
			return matched();
		}

		// Check for illegal whitespace (tab, newline, CR)
		if (ILLEGAL_WHITESPACE.test(trimmed)) {
			return unmatched(trimmed, 'unexpected-token');
		}

		// Check for forbidden code points (C0/C1 controls, noncharacters)
		if (FORBIDDEN_CODE_POINT.test(trimmed)) {
			return unmatched(trimmed, 'unexpected-token');
		}

		// Check for malformed percent-encoding
		if (MALFORMED_PERCENT.test(trimmed)) {
			return unmatched(trimmed, 'unexpected-token');
		}

		// Check for unencoded spaces
		if (UNENCODED_SPACE.test(trimmed)) {
			return unmatched(trimmed, 'unexpected-token');
		}

		// URL LS validation errors that `new URL()` silently auto-corrects:

		// special-scheme-missing-following-solidus / file-scheme-missing-following-solidus
		// (e.g., `http:foo`, `file:bar`, `file:` alone)
		if (SPECIAL_SCHEME_MISSING_SOLIDUS.test(trimmed)) {
			return unmatched(trimmed, 'unexpected-token');
		}

		// Single-slash variant: `http:/foo`, `file:/foo`
		// (URL LS recovers but flags it as a validation error.)
		if (SPECIAL_SCHEME_SINGLE_SLASH.test(trimmed)) {
			return unmatched(trimmed, 'unexpected-token');
		}

		// file-invalid-Windows-drive-letter (e.g., `file:///C|/foo`)
		if (FILE_WINDOWS_DRIVE_LETTER_WITH_BAR.test(trimmed)) {
			return unmatched(trimmed, 'unexpected-token');
		}

		// invalid-reverse-solidus: `\` in a special-scheme (or scheme-relative) URL.
		// Non-special schemes (e.g., `data:`, `mailto:`) allow backslash in their
		// opaque path, so we gate this on the scheme.
		if (isSpecialOrSchemeless(trimmed) && trimmed.includes('\\')) {
			return unmatched(trimmed, 'unexpected-token');
		}

		// invalid-credentials with empty userinfo: `http://@host`, `//@host`.
		// `new URL()` parses these into empty username/password fields, so the
		// post-parse property check below would miss them.
		if (SPECIAL_SCHEME_AUTHORITY_HAS_AT_SIGN.test(trimmed)) {
			return unmatched(trimmed, 'unexpected-token');
		}

		// More than one `#` in the URL — multiple hash delimiters.
		// Only meaningful for special-scheme / scheme-relative URLs; non-special
		// schemes (`data:`, `javascript:`) treat everything before/after as
		// opaque content where extra `#` is the user's own data.
		if (isSpecialOrSchemeless(trimmed) && MULTIPLE_HASH.test(trimmed)) {
			return unmatched(trimmed, 'unexpected-token');
		}

		// invalid-URL-unit: `[` or `]` outside the IPv6 host position.
		if (hasBracketsOutsideHost(trimmed)) {
			return unmatched(trimmed, 'unexpected-token');
		}

		// data: URL without a comma — RFC 2397 violation.
		if (DATA_URL_MISSING_COMMA.test(trimmed)) {
			return unmatched(trimmed, 'unexpected-token');
		}

		// IPv4-non-decimal-part: a host label written in hex/octal notation.
		// Only special-scheme (or scheme-relative) URLs have their host run
		// through the IPv4 parser; non-special schemes have an opaque host.
		if (isSpecialOrSchemeless(trimmed) && hasIPv4NonDecimalPart(trimmed)) {
			return unmatched(trimmed, 'unexpected-token');
		}

		// Structural parse — `URL.canParse` is preferred over `new URL()` +
		// try/catch because it returns a boolean instead of throwing, which
		// would otherwise need an `isFatalError` guard per the project's
		// Three-Tier Error policy. (Available since Node 19; the package
		// requires Node 22+.)
		//
		// invalid-credentials with a non-empty userinfo (`http://user:pass@`)
		// is also caught structurally here — the regex above
		// (`SPECIAL_SCHEME_AUTHORITY_HAS_AT_SIGN`) already covers every
		// `@`-in-authority case (including the empty-userinfo variant), so a
		// post-parse `parsed.username/password` check would be unreachable.
		if (URL.canParse(trimmed)) {
			return matched();
		}
		if (URL.canParse(trimmed, DUMMY_BASE)) {
			return matched();
		}
		return unmatched(trimmed, 'unexpected-token');
	};
