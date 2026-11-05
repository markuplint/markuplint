import type { Token } from '../token/index.js';
import type { CustomSyntaxChecker } from '../types.js';

import { log } from '../debug.js';
import { matched } from '../match-result.js';
import { TokenCollection } from '../token/index.js';

/**
 * ASCII whitespace is TAB, LF, FF, CR and SPACE. `\s` also matches Unicode
 * whitespace such as U+3000, which must not separate tokens here.
 *
 * @see https://infra.spec.whatwg.org/#ascii-whitespace
 */
const ASCII_WHITESPACES = /[\t\n\f\r ]*/;

const NON_ASCII_WHITESPACES = /[^\t\n\f\r ]*/;

/**
 * Checks the value of `iframe[allow]`.
 *
 * @see https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy
 *
 * > A serialized permissions policy is a string made of entries separated by U+003B (;).
 * > After stripping leading and trailing ASCII whitespace, each entry must be one of:
 * >
 * > - empty;
 * > - the token of a policy-controlled feature;
 * > - the token of a policy-controlled feature, followed by one or more ASCII whitespace and "'none'";
 * > - the token of a policy-controlled feature, followed by one or more ASCII whitespace and
 * >   one or more allowlist values separated by one or more ASCII whitespace.
 * >
 * > The same token must not appear in more than one entry.
 * >
 * > Each allowlist value must be one of:
 * >
 * > - "*";
 * > - "'self'", which refers to the origin of the Document that contains the element;
 * > - "'src'", which refers to the element's declared origin;
 * > - the serialization of an origin that is not an opaque origin and whose host does not contain
 * >   U+002A (*), optionally followed by U+002F (/).
 *
 * The specification does not define the grammar of a feature token, and the
 * set of policy-controlled features is open-ended, so a token is not checked
 * against a list of known features. It is checked against lowercase ASCII
 * letters, digits and hyphens, which the tokens of the listed features are
 * made of, so that a mistake such as `camera:` or `Camera` is still reported.
 *
 * @see https://github.com/w3c/webappsec-permissions-policy/blob/master/features.md
 *
 * Feature tokens are compared as written. `'none'`, `'self'` and `'src'` are
 * matched ASCII case-insensitively, as the parsing algorithm of the
 * specification does.
 *
 * @see https://w3c.github.io/webappsec-permissions-policy/#algo-parse-policy-directive
 */
export const checkSerializedPermissionsPolicy: CustomSyntaxChecker = () => value => {
	const res = _checkSerializedPermissionsPolicy(value);

	if (!res.matched && log.enabled) {
		log('Failed: %O', res);
	}

	return res;
};

function _checkSerializedPermissionsPolicy(value: string) {
	const patterns = [/[^;]*/, /;?/];
	const tokens = TokenCollection.fromPatterns(value, patterns, { repeat: true });
	const entries = tokens.chunk(patterns.length);

	if (log.enabled) {
		log('Serialized Permissions Policy: %s => %O', value, entries);
	}

	const featureTokens = new Set<string>();

	for (const [entry] of entries) {
		if (!entry) {
			continue;
		}

		const [leadingWhitespace, featureToken, separatingWhitespace, allowListToken] = TokenCollection.fromPatterns(
			entry,
			[
				// ASCII whitespace stripped from the start of the entry
				ASCII_WHITESPACES,
				// The token of a policy-controlled feature
				NON_ASCII_WHITESPACES,
				// One or more ASCII whitespace before the allowlist
				ASCII_WHITESPACES,
				// The allowlist: the rest of the entry
				/[\s\S]*/,
			],
		);

		if (log.enabled) {
			log('Entry: %s => %O', entry.value, {
				leadingWhitespace,
				featureToken,
				separatingWhitespace,
				allowListToken,
			});
		}

		/**
		 * An entry that is empty after stripping ASCII whitespace
		 */
		if (!featureToken || !featureToken.value) {
			continue;
		}

		if (!featureToken.matches(/^[\da-z-]+$/)) {
			return featureToken.unmatched({
				reason: 'unexpected-token',
				expects: [{ type: 'common', value: 'feature-identifier' }],
				partName: 'feature-identifier',
			});
		}

		/**
		 * > The same token must not appear in more than one entry.
		 */
		if (featureTokens.has(featureToken.value)) {
			return featureToken.unmatched({
				reason: 'duplicated',
				partName: 'feature-identifier',
			});
		}

		featureTokens.add(featureToken.value);

		if (!allowListToken || !allowListToken.value) {
			continue;
		}

		const allowListPatterns = [
			// Value
			NON_ASCII_WHITESPACES,
			// Separator
			ASCII_WHITESPACES,
		];
		const allowListTokens = TokenCollection.fromPatterns(allowListToken, allowListPatterns, { repeat: true });
		const allowList = allowListTokens.chunk(allowListPatterns.length);

		if (log.enabled) {
			log('Allow List: %s => %O', allowListTokens.value, allowList);
		}

		const allowListValues = allowList
			.map(([allow]) => allow)
			.filter((allow): allow is Token => Boolean(allow?.value));

		for (const [index, allow] of allowListValues.entries()) {
			/**
			 * > the token of a policy-controlled feature, followed by one or more ASCII whitespace and "'none'"
			 *
			 * `'none'` is not an allowlist value. It is only valid as the whole allowlist of an entry.
			 */
			if (allow.matches("'none'", true)) {
				if (allowListValues.length > 1) {
					return allow.unmatched({
						reason: 'illegal-combination',
						partName: 'allow-list',
					});
				}
				continue;
			}

			if (allow.matches(['*', "'self'", "'src'"], true)) {
				continue;
			}

			if (allow.matches(['self', 'src', 'none'], true)) {
				return allow.unmatched({
					reason: 'missing-token',
					expects: [{ type: 'common', value: 'single-quote' }],
					partName: 'keyword',
				});
			}

			const origin = checkSerializedOrigin(allow);

			if (origin.matched) {
				continue;
			}

			if (origin.reason !== 'syntax-error') {
				return origin;
			}

			return allow.unmatched({
				reason: 'unexpected-token',
				expects: [
					{ type: 'const', value: '*' },
					{ type: 'const', value: "'self'" },
					{ type: 'const', value: "'src'" },
					// `'none'` is only valid as the whole allowlist, so only the first value can be it.
					...(index === 0 ? [{ type: 'const' as const, value: "'none'" }] : []),
					{ type: 'common', value: 'serialized-origin' },
				],
				partName: 'allow-list',
			});
		}
	}

	return matched();
}

/**
 * The schemes whose URLs have a tuple origin (scheme, host, port). The origin
 * of any other URL is opaque, except for `file:`, which the URL Standard
 * leaves to the implementation, and `blob:`, which takes the origin of the
 * URL it embeds. Listing the schemes keeps the verdict the same on every
 * runtime, whereas `URL.origin` of a `file:` URL differs between them. A
 * `blob:` token is rejected as well: it is not the serialization of its origin.
 *
 * @see https://url.spec.whatwg.org/#concept-url-origin
 */
const TUPLE_ORIGIN_PROTOCOLS: ReadonlySet<string> = new Set(['ftp:', 'http:', 'https:', 'ws:', 'wss:']);

/**
 * The serialization of an origin that is not an opaque origin and whose host
 * does not contain U+002A (*), optionally followed by U+002F (/).
 *
 * @see https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy
 */
function checkSerializedOrigin(token: Readonly<Token>) {
	const url = parseUrl(token.value);

	if (log.enabled) {
		log('Parse URL: "%s" => %O', token.value, url);
	}

	if (!url) {
		return token.unmatched({
			expects: [{ type: 'common', value: 'serialized-origin' }],
		});
	}

	if (!TUPLE_ORIGIN_PROTOCOLS.has(url.protocol)) {
		return token.unmatched({
			expects: [{ type: 'common', value: 'serialized-origin' }],
		});
	}

	if (url.pathname && url.pathname !== '/') {
		return token.unmatched({
			reason: 'extra-token',
			extra: { type: 'common', value: 'pathname' },
			partName: 'serialized-origin',
		});
	}

	// `URL.search` and `URL.hash` are empty for a bare `?` or `#`, so the token is what is checked.
	if (token.value.includes('?')) {
		return token.unmatched({
			reason: 'extra-token',
			extra: { type: 'common', value: 'query' },
			partName: 'serialized-origin',
		});
	}

	if (token.value.includes('#')) {
		return token.unmatched({
			reason: 'extra-token',
			extra: { type: 'common', value: 'hash' },
			partName: 'serialized-origin',
		});
	}

	if (url.username) {
		return token.unmatched({
			reason: 'extra-token',
			extra: { type: 'common', value: 'username' },
			partName: 'serialized-origin',
		});
	}

	if (url.password) {
		return token.unmatched({
			reason: 'extra-token',
			extra: { type: 'common', value: 'password' },
			partName: 'serialized-origin',
		});
	}

	if (url.host.includes('*')) {
		return token.unmatched({
			reason: 'unexpected-token',
			expects: [{ type: 'common', value: 'serialized-origin' }],
			partName: 'serialized-origin',
		});
	}

	/**
	 * The token must be the serialization of the origin itself,
	 * apart from the optional trailing U+002F (/).
	 */
	const withoutTrailingSlash = token.value.endsWith('/') ? token.value.slice(0, -1) : token.value;

	if (withoutTrailingSlash !== url.origin) {
		return token.unmatched({
			reason: 'must-be-serialized',
			partName: 'serialized-origin',
		});
	}

	return matched();
}

function parseUrl(value: string) {
	try {
		return new URL(value);
	} catch {
		return null;
	}
}
