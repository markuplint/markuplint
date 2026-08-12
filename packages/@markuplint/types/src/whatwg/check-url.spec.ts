import { test, expect } from 'vitest';

import { checkURL } from './check-url.js';

// cspell:ignore FDEF FFFE XFFFE XFFFF AFFFE AFFFF BFFFE BFFFF CFFFE CFFFF DFFFE DFFFF EFFFE EFFFF FFFFE FFFFF

const check = checkURL();

test('valid absolute URLs', () => {
	expect(check('https://example.com').matched).toBe(true);
	expect(check('http://example.com/path?q=1#hash').matched).toBe(true);
	expect(check('mailto:user@example.com').matched).toBe(true);
	expect(check('tel:+1234567890').matched).toBe(true);
});

test('valid relative URLs', () => {
	expect(check('/path/to/page').matched).toBe(true);
	expect(check('relative/path').matched).toBe(true);
	expect(check('../parent').matched).toBe(true);
	expect(check('#fragment').matched).toBe(true);
	expect(check('?query=1').matched).toBe(true);
});

test('empty URL is valid', () => {
	expect(check('').matched).toBe(true);
});

test('URL with surrounding spaces is valid', () => {
	expect(check('  https://example.com  ').matched).toBe(true);
});

test('illegal whitespace (tab)', () => {
	expect(check('http://exa\tmple.com').matched).toBe(false);
});

test('illegal whitespace (newline)', () => {
	expect(check('http://example.\ncom').matched).toBe(false);
});

test('illegal whitespace (CR)', () => {
	expect(check('http://example.\rcom').matched).toBe(false);
});

test('malformed percent-encoding', () => {
	expect(check('http://example.com/a%ZZ').matched).toBe(false);
	expect(check('http://example.com/%').matched).toBe(false);
	expect(check('http://example.com/%2').matched).toBe(false);
});

test('valid percent-encoding', () => {
	expect(check('http://example.com/%20path').matched).toBe(true);
	expect(check('/path/%E3%81%82').matched).toBe(true);
});

test('C0 control characters', () => {
	expect(check('http://example.com/\u0000').matched).toBe(false);
	expect(check('http://example.com/\u0008').matched).toBe(false);
	expect(check('http://example.com/\u007F').matched).toBe(false);
});

test('C1 control characters (U+0080–U+009F)', () => {
	expect(check('http://example.com/\u0080').matched).toBe(false);
	expect(check('http://example.com/\u009F').matched).toBe(false);
});

test('BMP Unicode noncharacters', () => {
	expect(check('http://example.com/\uFDD0').matched).toBe(false);
	expect(check('http://example.com/\uFDEF').matched).toBe(false);
	expect(check('http://example.com/\uFFFE').matched).toBe(false);
	expect(check('http://example.com/\uFFFF').matched).toBe(false);
});

test('supplementary plane noncharacters (U+XFFFE / U+XFFFF)', () => {
	expect(check('http://example.com/\u{1FFFE}').matched).toBe(false);
	expect(check('http://example.com/\u{1FFFF}').matched).toBe(false);
	expect(check('http://example.com/\u{10FFFE}').matched).toBe(false);
	expect(check('http://example.com/\u{10FFFF}').matched).toBe(false);
});

test('vertical tab at any boundary is not silently stripped', () => {
	// JavaScript's String.prototype.trim() treats U+000B as whitespace and
	// would silently remove it before the forbidden-code-point check runs.
	// HTML "strip leading and trailing ASCII whitespace" only strips
	// U+0009 / U+000A / U+000C / U+000D / U+0020 — so U+000B must still
	// trigger a forbidden code point error at any position.
	expect(check('\u000Bhttp://example.com/').matched).toBe(false);
	expect(check('http://example.com/\u000B').matched).toBe(false);
	expect(check('\u000Bhttp://example.com/\u000B').matched).toBe(false);
	expect(check('http://example.com/path\u000B').matched).toBe(false);
});

test('HTML ASCII whitespace at URL boundaries is stripped', () => {
	// Per HTML "strip leading and trailing ASCII whitespace":
	// TAB (U+0009), LF (U+000A), FF (U+000C), CR (U+000D), SPACE (U+0020).
	// Mid-URL TAB / LF / CR are caught by ILLEGAL_WHITESPACE; these cases
	// only exercise the boundary-strip behaviour of stripAsciiWhitespace.
	expect(check('\thttps://example.com').matched).toBe(true);
	expect(check('\nhttps://example.com').matched).toBe(true);
	expect(check('\fhttps://example.com').matched).toBe(true);
	expect(check('\rhttps://example.com').matched).toBe(true);
	expect(check('https://example.com\t\n\f\r ').matched).toBe(true);
	expect(check('\t\n\f\r https://example.com\t\n\f\r ').matched).toBe(true);
});

test('NBSP embedded in URL is not classified as a forbidden code point', () => {
	// NBSP (U+00A0) is not in HTML LS "forbidden code points" and must pass
	// the FORBIDDEN_CODE_POINT check. new URL() percent-encodes it in the
	// path, so the full validation accepts it.
	expect(check('http://example.com/\u00A0').matched).toBe(true);
});

test('non-ASCII code points outside the forbidden set are valid', () => {
	// Guard against accidental regex range expansion: PUA and emoji must
	// not be misclassified as forbidden.
	expect(check('http://example.com/\u{E000}').matched).toBe(true); // BMP PUA start
	expect(check('http://example.com/\u{F8FF}').matched).toBe(true); // BMP PUA end
	expect(check('http://example.com/\u{F0000}').matched).toBe(true); // Supp-A PUA
	expect(check('http://example.com/\u{100000}').matched).toBe(true); // Supp-B PUA
	expect(check('http://example.com/\u{1F4A9}').matched).toBe(true); // emoji
});

test('code points adjacent to forbidden ranges are valid', () => {
	// Boundary guards for the FORBIDDEN_CODE_POINT regex.
	expect(check('http://example.com/\u007E').matched).toBe(true); // just before DEL
	expect(check('http://example.com/\u00A0').matched).toBe(true); // just after C1
	expect(check('http://example.com/\uFDCF').matched).toBe(true); // just before FDD0
	expect(check('http://example.com/\uFDF0').matched).toBe(true); // just after FDEF
	expect(check('http://example.com/\uFFFD').matched).toBe(true); // just before FFFE
	expect(check('http://example.com/\u{1FFFD}').matched).toBe(true); // before 1FFFE
	expect(check('http://example.com/\u{10FFFD}').matched).toBe(true); // before 10FFFE
});

test('multiple consecutive forbidden code points are detected', () => {
	// `test()` short-circuits at the first match, but the regex has to be
	// general enough that the first match can be ANY of the forbidden code
	// points. A regression that accidentally anchors the regex would fail
	// one of these cases.
	expect(check('http://example.com/\u0080\u0081').matched).toBe(false);
	expect(check('http://example.com/\uFDD0\uFFFE').matched).toBe(false);
	expect(check('http://example.com/\u{1FFFE}\u{2FFFE}').matched).toBe(false);
	expect(check('http://example.com/ab\u{10FFFF}c').matched).toBe(false);
});

test('space in URL (unencoded)', () => {
	// Spaces in path cause new URL() to fail for absolute URLs.
	// For relative URLs with dummy base, space is allowed by new URL()
	// but URL LS reports invalid-URL-unit and nu-validator rejects it.
	expect(check('http://example.com/path with space').matched).toBe(false);
});

test('javascript: scheme', () => {
	// javascript: URLs are syntactically valid
	expect(check('javascript:void(0)').matched).toBe(true);
});

test('data: scheme', () => {
	expect(check('data:text/html,<h1>Hello</h1>').matched).toBe(true);
});

// --- URL LS validation errors ---
//
// Each block below targets a specific URL LS validation error category that
// `new URL()` silently auto-corrects. The fixtures listed under each block
// are pulled from `tests/external/validator/tests/html/elements/a/href/`
// and `tests/external/validator/tests/html/microdata/itemid/` (see
// Issue #3848).

// invalid-credentials
// https://url.spec.whatwg.org/#invalid-credentials
test('invalid-credentials: special-scheme URL with userinfo is rejected', () => {
	expect(check('http://user:pass@example.com/').matched).toBe(false);
	expect(check('http://user@example.com/').matched).toBe(false);
	expect(check('https://u:p@example.com').matched).toBe(false);
	expect(check('ftp://user:pass@example.com').matched).toBe(false);
});

test('invalid-credentials: non-special schemes with `@` in opaque path are accepted', () => {
	// `mailto:`, `news:` etc. put everything after the scheme into an opaque
	// path; the `@` does not become userinfo, so credentials parsing yields
	// empty username/password — no false positive.
	expect(check('mailto:user@example.com').matched).toBe(true);
	expect(check('news:comp.lang.javascript').matched).toBe(true);
});

// special-scheme-missing-following-solidus
// https://url.spec.whatwg.org/#special-scheme-missing-following-solidus
test('special-scheme-missing-following-solidus: scheme without `//` is rejected', () => {
	expect(check('http:foo').matched).toBe(false);
	expect(check('https:foo').matched).toBe(false);
	expect(check('ftp:foo').matched).toBe(false);
	expect(check('ws:foo').matched).toBe(false);
	expect(check('wss:foo').matched).toBe(false);
});

test('special-scheme-missing-following-solidus is case-insensitive', () => {
	expect(check('HTTP:foo').matched).toBe(false);
	expect(check('FILE:foo').matched).toBe(false);
});

test('non-special schemes without `//` are accepted', () => {
	// `javascript:`, `data:`, `mailto:`, `tel:` are not special schemes.
	expect(check('javascript:alert(1)').matched).toBe(true);
	expect(check('data:text/plain,hello').matched).toBe(true);
	expect(check('mailto:foo@example.com').matched).toBe(true);
	expect(check('tel:+1-555-0100').matched).toBe(true);
});

// special-scheme single-slash variant
test('special-scheme with a single slash is rejected', () => {
	expect(check('http:/foo').matched).toBe(false);
	expect(check('https:/foo').matched).toBe(false);
	expect(check('ftp:/foo').matched).toBe(false);
	expect(check('ws:/foo').matched).toBe(false);
	expect(check('wss:/foo').matched).toBe(false);
});

// file-scheme-missing-following-solidus
// https://url.spec.whatwg.org/#file-scheme-missing-following-solidus
test('file-scheme-missing-following-solidus: `file:foo`, `file:/foo`, `file:` rejected', () => {
	expect(check('file:foo').matched).toBe(false);
	expect(check('file:/foo').matched).toBe(false);
	expect(check('file:').matched).toBe(false);
	expect(check('file:/').matched).toBe(false);
});

test('file-scheme correctly written `file:///path` is accepted', () => {
	expect(check('file:///foo/bar').matched).toBe(true);
	expect(check('file:///C:/Users/test').matched).toBe(true);
});

// invalid-reverse-solidus
// https://url.spec.whatwg.org/#invalid-reverse-solidus
test('invalid-reverse-solidus: `\\` in special-scheme URL is rejected', () => {
	expect(check('http://example.com\\path').matched).toBe(false);
	expect(check('https://example.com/foo\\bar').matched).toBe(false);
	expect(check('file:///foo\\bar').matched).toBe(false);
});

test('invalid-reverse-solidus: `\\` in scheme-relative (relative) URL is rejected', () => {
	// Relative URLs resolve against the document's base URL, which in HTML is
	// almost always a special-scheme URL — so backslash is still a violation.
	expect(check('/foo\\bar').matched).toBe(false);
	expect(check('foo\\bar').matched).toBe(false);
	expect(check('#\\').matched).toBe(false);
});

test('invalid-reverse-solidus: `\\` in non-special scheme opaque path is accepted', () => {
	// Non-special schemes treat everything after `:` as an opaque path;
	// backslash is a regular code point there.
	expect(check('data:text/plain,a\\b').matched).toBe(true);
	expect(check('javascript:foo\\bar').matched).toBe(true);
	expect(check('mailto:foo\\bar@example.com').matched).toBe(true);
});

// file-invalid-Windows-drive-letter
// https://url.spec.whatwg.org/#file-invalid-windows-drive-letter
test('file-invalid-Windows-drive-letter: `|` instead of `:` is rejected', () => {
	expect(check('file:///C|/foo').matched).toBe(false);
	expect(check('file://C|/foo').matched).toBe(false);
	expect(check('file:/C|/foo').matched).toBe(false);
	expect(check('file:C|/foo').matched).toBe(false);
	expect(check('FILE:///c|/foo').matched).toBe(false);
});

test('file-scheme with proper Windows drive letter `C:` is accepted', () => {
	expect(check('file:///C:/foo').matched).toBe(true);
});

// Existing nu-validator coverage cases
test('host-empty: bare scheme://', () => {
	// `new URL("http://")` throws → caught by structural parse fallback.
	expect(check('http://').matched).toBe(false);
});

test('host-empty-with-userinfo: `http://user:pass@/` is rejected', () => {
	// Either invalid-credentials triggers (userinfo non-empty) or `new URL()`
	// throws on the empty host. Both paths produce unmatched.
	expect(check('http://user:pass@/').matched).toBe(false);
});

// invalid-credentials with empty userinfo
test('invalid-credentials: empty userinfo (`http://@host`) is rejected', () => {
	expect(check('http://@example.com').matched).toBe(false);
	expect(check('//@example.com').matched).toBe(false);
	expect(check('http://@/').matched).toBe(false);
	expect(check('//user@example.com').matched).toBe(false);
});

// fragment-contains-hash → invalid-URL-unit
test('multiple `#` in URL is rejected', () => {
	expect(check('http://foo/path#f#g').matched).toBe(false);
	expect(check('https://example.com#a#b').matched).toBe(false);
	expect(check('/path#a#b').matched).toBe(false);
});

test('multiple `#` in non-special-scheme URL is accepted', () => {
	// `data:`, `javascript:` etc. treat content as opaque — extra `#` is data.
	expect(check('data:text/plain,a#b#c').matched).toBe(true);
	expect(check('javascript:alert("a#b#c")').matched).toBe(true);
});

// invalid-URL-unit: brackets outside the IPv6 host position
test('brackets outside host are rejected', () => {
	// Relative URL that looks like IPv6 (square brackets, colons).
	expect(check('[61:24:74]:98').matched).toBe(false);
	// Brackets in path of special-scheme URL.
	expect(check('http://example.com/path[a]').matched).toBe(false);
	// Brackets in opaque path of non-special scheme.
	expect(check('data:[foo]').matched).toBe(false);
	// Brackets in fragment.
	expect(check('http://example.com/#[a]').matched).toBe(false);
});

test('IPv6 host brackets are accepted', () => {
	// `[::1]` and other IPv6 literals are the only legitimate use of
	// `[`/`]` in a URL — they delimit the host of a special-scheme URL.
	expect(check('http://[::1]/path').matched).toBe(true);
	expect(check('http://[2001:db8::1]:8080/path').matched).toBe(true);
});

// RFC 2397 data: URL grammar
test('data: URL without `,` is rejected', () => {
	expect(check('data:').matched).toBe(false);
	expect(check('data:/example.com/').matched).toBe(false);
	expect(check('data:text/plain').matched).toBe(false);
});

test('data: URL with `,` is accepted', () => {
	expect(check('data:,hello').matched).toBe(true);
	expect(check('data:text/plain,foo').matched).toBe(true);
	expect(check('data:text/plain;base64,SGVsbG8=').matched).toBe(true);
});

// URL LS §3.5 IPv4 number parser — `IPv4-non-decimal-part`
test('IPv4-non-decimal-part: hex host label is rejected', () => {
	expect(check('http://192.0x00A80001').matched).toBe(false);
});

test('IPv4-non-decimal-part: fullwidth Unicode obfuscation is rejected', () => {
	// NFKC-normalizes to "0Xc0.0250.01" — hex + octal-leading-zero labels.
	expect(check('http://０Ｘｃ０．０２５０．０１').matched).toBe(false);
});

test('IPv4-non-decimal-part: percent-encoded obfuscation is rejected', () => {
	// Decodes to "0xc0.0250.01" — hex + octal-leading-zero labels.
	expect(check('http://%30%78%63%30%2e%30%32%35%30.01').matched).toBe(false);
});

test('IPv4-non-decimal-part: leading-zero octal host label is rejected', () => {
	expect(check('http://127.000.000.1').matched).toBe(false);
});

test('valid decimal IPv4 host is accepted', () => {
	expect(check('http://192.168.0.1').matched).toBe(true);
	expect(check('http://0.0.0.0').matched).toBe(true);
	expect(check('http://127.0.0.1:8080/path').matched).toBe(true);
});

test('IPv4-non-decimal-part check does not false-positive on ordinary domains', () => {
	// Last label ("com") does not look numeric, so the IPv4 parser never runs.
	expect(check('http://0x1.example.com').matched).toBe(true);
	expect(check('http://order-0123.example.com/path').matched).toBe(true);
});

test('IPv4-non-decimal-part check is scoped to special-scheme/scheme-relative hosts', () => {
	// Non-special schemes have an opaque host — no IPv4 parsing applies.
	expect(check('mailto:0x1@example.com').matched).toBe(true);
});
