import type { CustomSyntaxChecker } from '../types.js';

import { log } from '../debug.js';
import { matched } from '../match-result.js';
import { Token } from '../token/index.js';

/**
 * Fetch Directives — value grammar is a `serialized-source-list`.
 *
 * @see https://www.w3.org/TR/CSP3/#directives-fetch
 */
const FETCH_DIRECTIVES = new Set([
	'child-src',
	'connect-src',
	'default-src',
	'font-src',
	'frame-src',
	'img-src',
	'manifest-src',
	'media-src',
	'object-src',
	'script-src',
	'script-src-attr',
	'script-src-elem',
	'style-src',
	'style-src-attr',
	'style-src-elem',
	'worker-src',
]);

/**
 * Directives whose value is also a `serialized-source-list`, per
 * CSP3 §6.7.2 ("This section defines the syntax common to all fetch
 * directives, as well as `base-uri`, `form-action`, and `frame-ancestors`").
 *
 * @see https://www.w3.org/TR/CSP3/#framework-directive-source-list
 */
const SOURCE_LIST_DIRECTIVES = new Set([...FETCH_DIRECTIVES, 'base-uri', 'form-action', 'frame-ancestors']);

/**
 * Directives that carry no value at all.
 *
 * @see https://www.w3.org/TR/upgrade-insecure-requests/#delivery
 */
const NO_VALUE_DIRECTIVES = new Set(['upgrade-insecure-requests']);

/**
 * Directives recognized by name, whose value grammar this checker does not
 * further validate (accepts anything, including empty): `report-uri` /
 * `report-to` (URI-reference list / single token) and `webrtc` (`'allow'` /
 * `'block'`), none of which are exercised by the nu-validator bench corpus.
 */
const UNVALIDATED_VALUE_DIRECTIVES = new Set(['report-uri', 'report-to', 'webrtc']);

/**
 * The complete set of currently-specified CSP directive names: CSP3 §6
 * itself (fetch directives, `base-uri`, `sandbox`, `form-action`,
 * `frame-ancestors`, `report-uri`, `report-to`, `webrtc`), plus directives
 * defined by companion specs that are nonetheless part of the CSP delivery
 * mechanism and widely deployed: `require-trusted-types-for` / `trusted-types`
 * (Trusted Types) and `upgrade-insecure-requests` (Upgrade Insecure Requests).
 *
 * @see https://www.w3.org/TR/CSP3/#directives
 * @see https://www.w3.org/TR/trusted-types/#require-trusted-types-for-csp-directive
 * @see https://www.w3.org/TR/trusted-types/#trusted-types-csp-directive
 * @see https://www.w3.org/TR/upgrade-insecure-requests/#delivery
 */
const KNOWN_DIRECTIVES = new Set([
	...SOURCE_LIST_DIRECTIVES,
	...NO_VALUE_DIRECTIVES,
	...UNVALIDATED_VALUE_DIRECTIVES,
	'sandbox',
	'require-trusted-types-for',
	'trusted-types',
]);

/**
 * Mirrors the `sandbox` attribute's sandboxing-token enum in
 * `packages/@markuplint/html-spec/src/spec.iframe.jsonc`. Keep the two in
 * sync — there is no shared runtime source because `@markuplint/types` does
 * not depend on `@markuplint/html-spec`.
 *
 * @see https://html.spec.whatwg.org/multipage/iframe-embed-object.html#attr-iframe-sandbox
 */
const SANDBOX_TOKENS = new Set([
	'allow-downloads',
	'allow-forms',
	'allow-modals',
	'allow-orientation-lock',
	'allow-pointer-lock',
	'allow-popups',
	'allow-popups-to-escape-sandbox',
	'allow-presentation',
	'allow-same-origin',
	'allow-scripts',
	'allow-top-navigation',
	'allow-top-navigation-by-user-activation',
	'allow-custom-protocols-navigation',
]);

/**
 * `source-expression` keyword-source alternatives, excluding `'none'`
 * (which the grammar restricts to being the sole item of the list).
 *
 * @see https://www.w3.org/TR/CSP3/#grammardef-source-expression
 */
const KEYWORD_SOURCES = new Set([
	"'self'",
	"'unsafe-inline'",
	"'unsafe-eval'",
	"'strict-dynamic'",
	"'unsafe-hashes'",
	"'report-sample'",
	"'unsafe-allow-redirects'",
]);

const NONE_SOURCE = "'none'";

/**
 * `scheme-part ":"`, e.g. `https:`, `data:`, `blob:`.
 */
const SCHEME_SOURCE = /^[A-Z][A-Z0-9+.-]*:$/i;

/**
 * `[ scheme-part "://" ] host-part [ port-part ] [ path-part ]`.
 * Non-ASCII authorities are already rejected by the ASCII-only guard in
 * {@link checkContentSecurityPolicy} before this pattern is reached.
 */
const HOST_SOURCE =
	/^(?:[A-Z][A-Z0-9+.-]*:\/\/)?(?:\*|(?:\*\.)?[A-Z0-9-]+(?:\.[A-Z0-9-]+)*)(?::(?:\d+|\*))?(?:\/\S*)?$/i;

/**
 * `"'nonce-" base64-value "'"`.
 */
const NONCE_SOURCE = /^'nonce-[\w+/-]+={0,2}'$/;

/**
 * `"'" hash-algorithm "-" base64-value "'"`.
 */
const HASH_SOURCE = /^'sha(?:256|384|512)-[\w+/-]+={0,2}'$/;

/**
 * @see https://www.w3.org/TR/CSP3/#grammardef-directive-name
 */
const DIRECTIVE_NAME = /^[A-Z0-9-]+$/i;

/**
 * `trusted-types-policy-name` charset.
 *
 * @see https://www.w3.org/TR/trusted-types/#framework-directive-trusted-types
 */
const TRUSTED_TYPES_POLICY_NAME = /^[\w\-#=/@.%]+$/;
const TRUSTED_TYPES_KEYWORDS = new Set(["'allow-duplicates'", "'none'"]);

/**
 * `directive-value = *( %x09 / %x20-2B / %x2D-3A / %x3C-7E )`, i.e. HTAB or
 * printable ASCII. The full serialized policy (delimiters included) must be
 * ASCII by construction, since `,`/`;` fall inside `%x20-7E` too.
 */
const ASCII_ONLY = /[^\t\u0020-\u007E]/;

/**
 * Splits `token` on every occurrence of the literal `delimiter`, returning
 * each piece as its own {@link Token} with an `offset` correct relative to
 * `token.originalValue` — the position precision this checker needs to
 * report the actual offending token (not the whole attribute value) is only
 * available by tracking offsets through every split, the same approach
 * `check-serialized-permissions-policy.ts` takes via `TokenCollection`.
 */
function splitToken(token: Readonly<Token>, delimiter: string): Token[] {
	const pieces: Token[] = [];
	let start = 0;
	let idx = token.value.indexOf(delimiter, start);
	while (idx !== -1) {
		pieces.push(new Token(token.value.slice(start, idx), token.offset + start, token.originalValue));
		start = idx + delimiter.length;
		idx = token.value.indexOf(delimiter, start);
	}
	pieces.push(new Token(token.value.slice(start), token.offset + start, token.originalValue));
	return pieces;
}

/** Same as {@link splitToken}, but on a whitespace-run pattern; empty pieces are dropped. */
function splitTokenByWhitespace(token: Readonly<Token>): Token[] {
	const pieces: Token[] = [];
	const re = /\s+/g;
	let lastIndex = 0;
	let match = re.exec(token.value);
	while (match) {
		pieces.push(
			new Token(token.value.slice(lastIndex, match.index), token.offset + lastIndex, token.originalValue),
		);
		lastIndex = match.index + match[0].length;
		match = re.exec(token.value);
	}
	pieces.push(new Token(token.value.slice(lastIndex), token.offset + lastIndex, token.originalValue));
	return pieces.filter(piece => piece.value.length > 0);
}

function trimToken(token: Readonly<Token>): Token {
	const leadingLength = token.value.length - token.value.trimStart().length;
	return new Token(token.value.trim(), token.offset + leadingLength, token.originalValue);
}

/**
 * Validates the `content` attribute value of
 * `<meta http-equiv="content-security-policy">` against the Content
 * Security Policy Level 3 `serialized-policy` grammar.
 *
 * Directive-value-specific grammars are only enforced for the directives
 * exercised by the nu-validator bench corpus (fetch directives + `base-uri`
 * / `form-action` / `frame-ancestors`, `sandbox`, `require-trusted-types-for`,
 * `trusted-types`, `upgrade-insecure-requests`); `report-uri` / `report-to` /
 * `webrtc` are recognized as registered directive names but their values are
 * not further validated.
 *
 * @see https://www.w3.org/TR/CSP3/#framework-policy
 * @see https://www.w3.org/TR/CSP3/#framework-directives
 * @see https://www.w3.org/TR/CSP3/#meta-element
 */
export const checkContentSecurityPolicy: CustomSyntaxChecker = () =>
	function checkContentSecurityPolicy(value) {
		log('CHECK: meta http-equiv="content-security-policy" content');

		// See ASCII_ONLY above. A non-ASCII authority (e.g. an IDN host written
		// as Unicode rather than punycode) fails here first.
		const nonAsciiMatch = ASCII_ONLY.exec(value);
		if (nonAsciiMatch) {
			const token = new Token(nonAsciiMatch[0], nonAsciiMatch.index, value);
			return token.unmatched({
				reason: 'syntax-error',
				expects: [{ type: 'format', value: 'ASCII-only Content Security Policy' }],
			});
		}

		/**
		 * The `<meta>` delivery algorithm strictly splits the attribute value
		 * on "," to obtain a list of independently-parsed policies, mirroring
		 * how multiple `Content-Security-Policy` HTTP header instances combine.
		 *
		 * @see https://www.w3.org/TR/CSP3/#meta-element
		 */
		const root = new Token(value, 0, value);
		for (const policyToken of splitToken(root, ',')) {
			const result = checkSerializedPolicy(policyToken);
			if (!result.matched) return result;
		}

		return matched();
	};

function checkSerializedPolicy(policyToken: Readonly<Token>) {
	for (const rawDirectiveToken of splitToken(policyToken, ';')) {
		const directiveToken = trimToken(rawDirectiveToken);
		// OWS-only segments are permitted: a trailing ";", an empty policy
		// (`content=""`), and the separator between adjacent directives.
		if (!directiveToken.value) continue;

		const spaceIndex = directiveToken.value.search(/\s/);
		const nameToken =
			spaceIndex === -1
				? directiveToken
				: new Token(
						directiveToken.value.slice(0, spaceIndex),
						directiveToken.offset,
						directiveToken.originalValue,
					);
		const name = nameToken.value.toLowerCase();
		const directiveValueToken =
			spaceIndex === -1
				? new Token('', directiveToken.offset + directiveToken.value.length, directiveToken.originalValue)
				: trimToken(
						new Token(
							directiveToken.value.slice(spaceIndex + 1),
							directiveToken.offset + spaceIndex + 1,
							directiveToken.originalValue,
						),
					);

		if (!DIRECTIVE_NAME.test(nameToken.value)) {
			return nameToken.unmatched({
				reason: 'unexpected-token',
				expects: [{ type: 'format', value: 'directive-name' }],
				partName: 'directive-name',
			});
		}

		if (!KNOWN_DIRECTIVES.has(name)) {
			return nameToken.unmatched({
				reason: 'doesnt-exist-in-enum',
				expects: [{ type: 'common', value: 'registered CSP directive name' }],
				partName: 'directive-name',
			});
		}

		const result = checkDirectiveValue(name, directiveValueToken);
		if (!result.matched) return result;
	}

	return matched();
}

function checkDirectiveValue(name: string, valueToken: Readonly<Token>) {
	if (SOURCE_LIST_DIRECTIVES.has(name)) return checkSourceList(valueToken);
	if (name === 'sandbox') return checkSandbox(valueToken);
	if (name === 'require-trusted-types-for') return checkRequireTrustedTypesFor(valueToken);
	if (name === 'trusted-types') return checkTrustedTypes(valueToken);

	if (NO_VALUE_DIRECTIVES.has(name) && valueToken.value) {
		return valueToken.unmatched({
			reason: 'extra-token',
			extra: { type: 'common', value: 'directive-value' },
			partName: name,
		});
	}

	// UNVALIDATED_VALUE_DIRECTIVES (report-uri / report-to / webrtc): accept anything.
	return matched();
}

function checkSourceList(valueToken: Readonly<Token>) {
	if (!valueToken.value) return matched();

	const tokens = splitTokenByWhitespace(valueToken);

	// `serialized-source-list = (source-expression *(RWS source-expression)) / "'none'"`
	// — `'none'` is only valid as the sole item of the list.
	if (tokens.length > 1) {
		const noneToken = tokens.find(token => token.value.toLowerCase() === NONE_SOURCE);
		if (noneToken) {
			return noneToken.unmatched({
				reason: 'illegal-combination',
				expects: [{ type: 'format', value: 'source-expression' }],
				partName: 'source-list',
			});
		}
	}

	for (const token of tokens) {
		const lower = token.value.toLowerCase();
		if (
			lower === NONE_SOURCE ||
			token.value === '*' ||
			KEYWORD_SOURCES.has(lower) ||
			NONCE_SOURCE.test(token.value) ||
			HASH_SOURCE.test(token.value) ||
			SCHEME_SOURCE.test(token.value) ||
			HOST_SOURCE.test(token.value)
		) {
			continue;
		}

		return token.unmatched({
			reason: 'unexpected-token',
			expects: [{ type: 'format', value: 'source-expression' }],
			partName: 'source-expression',
		});
	}

	return matched();
}

function checkSandbox(valueToken: Readonly<Token>) {
	if (!valueToken.value) return matched();

	for (const token of splitTokenByWhitespace(valueToken)) {
		if (!SANDBOX_TOKENS.has(token.value.toLowerCase())) {
			return token.unmatched({
				reason: 'doesnt-exist-in-enum',
				expects: [{ type: 'common', value: 'sandboxing-token' }],
				partName: 'sandbox',
			});
		}
	}

	return matched();
}

function checkRequireTrustedTypesFor(valueToken: Readonly<Token>) {
	const tokens = splitTokenByWhitespace(valueToken);

	if (tokens.length === 0) {
		return valueToken.unmatched({
			reason: 'missing-token',
			expects: [{ type: 'const', value: "'script'" }],
			partName: 'require-trusted-types-for',
		});
	}

	for (const token of tokens) {
		if (token.value.toLowerCase() !== "'script'") {
			return token.unmatched({
				reason: 'doesnt-exist-in-enum',
				expects: [{ type: 'const', value: "'script'" }],
				partName: 'require-trusted-types-for',
			});
		}
	}

	return matched();
}

function checkTrustedTypes(valueToken: Readonly<Token>) {
	if (!valueToken.value) return matched();

	for (const token of splitTokenByWhitespace(valueToken)) {
		if (
			token.value === '*' ||
			TRUSTED_TYPES_KEYWORDS.has(token.value.toLowerCase()) ||
			TRUSTED_TYPES_POLICY_NAME.test(token.value)
		) {
			continue;
		}

		return token.unmatched({
			reason: 'unexpected-token',
			expects: [{ type: 'format', value: 'trusted-types-value' }],
			partName: 'trusted-types',
		});
	}

	return matched();
}
