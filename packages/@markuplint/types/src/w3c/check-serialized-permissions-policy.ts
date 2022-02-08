import type { Token } from '../token';
import type { CustomSyntaxChecker } from '../types';

import { log } from '../debug';
import { matched, unmatched } from '../match-result';
import { TokenCollection } from '../token';

/**
 * @see https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy
 *
 * > Policy Directives in HTML attributes are represented as their
 * > ASCII serialization, with the following ABNF:
 * > ```abnf
 * > serialized-permissions-policy = serialized-policy-directive *(";" serialized-policy-directive)
 * > serialized-policy-directive = feature-identifier RWS allow-list
 * > feature-identifier = 1*( ALPHA / DIGIT / "-")
 * > allow-list = allow-list-value *(RWS allow-list-value)
 * > allow-list-value = serialized-origin / "*" / "'self'" / "'src'" / "'none'"
 * > ```
 *
 * But change below according to current supported:
 *
 * ```abnf
 * serialized-policy-directive = feature-identifier [RWS allow-list]
 * ```
 *
 * `allow-list` is optional.
 */
export const checkSerializedPermissionsPolicy: CustomSyntaxChecker = () => value => {
	const res = _checkSerializedPermissionsPolicy(value);

	if (!res.matched) {
		log('Failed: %O', res);
	}

	return res;
};

function _checkSerializedPermissionsPolicy(value: string) {
	/**
	 * The list of serialized-policy-directive
	 *
	 * > ```abnf
	 * > serialized-policy-directive *(";" serialized-policy-directive)
	 * > ```
	 */
	const patterns = [
		/**
		 * serialized-policy-directive
		 */
		/[^;]*/,
		/**
		 * separator
		 */
		/;?/,
	];
	const tokens = TokenCollection.fromPatterns(value, patterns, { repeat: true });
	const serializedPolicyDirectives = tokens.chunk(patterns.length);

	log('Serialized Permissions Policy: %s => %O', value, serializedPolicyDirectives);

	for (const [serializedPolicyDirective] of serializedPolicyDirectives) {
		if (!serializedPolicyDirective || !serializedPolicyDirective.value) {
			return unmatched('', 'empty-token');
		}

		const [aw, featureIdentifier, rws, allowListValue] = TokenCollection.fromPatterns(serializedPolicyDirective, [
			/**
			 * Any whitespace
			 */
			/\s*/,

			/**
			 * feature-identifier
			 *
			 * > ```abnf
			 * > feature-identifier = 1*( ALPHA / DIGIT / "-")
			 * > ```
			 */
			/[^\s]*/,

			/**
			 * RWS (Required whitespace)
			 *
			 * @see https://datatracker.ietf.org/doc/html/rfc7230#section-3.2.3
			 */
			/\s*/,

			/**
			 * allow-list-value
			 */
			/.*/,
		]);

		log('Serialized Policy Directive: %s => %O', serializedPolicyDirective.value, {
			aw,
			featureIdentifier,
			rws,
			allowListValue,
		});

		/**
		 * > ```abnf
		 * > feature-identifier = 1*( ALPHA / DIGIT / "-")
		 * > ```
		 */
		if (!featureIdentifier || !featureIdentifier.match(/^[a-z0-9-]+$/i)) {
			return featureIdentifier.unmatched({
				reason: 'unexpected-token',
				expects: [{ type: 'common', value: 'feature-identifier' }],
				partName: 'feature-identifier',
			});
		}

		if (!rws || !rws.value) {
			// return unmatched('', 'missing-token', {
			// 	expects: [{ type: 'common', value: 'whitespace' }],
			// 	partName: 'directive',
			// });
			continue;
		}

		if (!allowListValue || !allowListValue.value) {
			// return unmatched('', 'missing-token', {
			// 	expects: [{ type: 'common', value: 'allow-list' }],
			// 	partName: 'allow-list',
			// });
			continue;
		}

		const allowListPatterns = [
			// Value
			/[^\s]*/,
			// Separator
			/\s*/,
		];
		const allowListTokens = TokenCollection.fromPatterns(allowListValue, allowListPatterns, { repeat: true });
		const allowList = allowListTokens.chunk(allowListPatterns.length);

		log('Allow List: %s => %O', allowListTokens.value, allowList);

		for (const [allow] of allowList) {
			if (!allow || !allow.value) {
				return unmatched('', 'missing-token', {
					expects: [
						{ type: 'const', value: '*' },
						{ type: 'const', value: "'self'" },
						{ type: 'const', value: "'src'" },
						{ type: 'const', value: "'none'" },
						{ type: 'common', value: 'serialized-origin' },
					],
					partName: 'allow-list',
				});
			}

			const origin = checkSerializedOrigin(allow);

			if (origin.matched) {
				continue;
			}

			if (origin.reason !== 'syntax-error') {
				return origin;
			}

			if (allow.match(['*', "'self'", "'src'", "'none'"], true)) {
				continue;
			}

			if (allow.match(['self', 'src', 'none'], true)) {
				return allow.unmatched({
					reason: 'missing-token',
					expects: [{ type: 'common', value: 'single-quote' }],
					partName: 'keyword',
				});
			}

			return allow.unmatched({
				reason: 'unexpected-token',
				expects: [
					{ type: 'const', value: '*' },
					{ type: 'const', value: "'self'" },
					{ type: 'const', value: "'src'" },
					{ type: 'const', value: "'none'" },
					{ type: 'common', value: 'serialized-origin' },
				],
				partName: 'allow-list',
			});
		}
	}

	return matched();
}

/**
 * serialized-origin
 *
 * > serialized-origin is the serialization of an origin.
 * > However, the code points U+0027 ('), U+0021 (*), U+002C (,)
 * > and U+003B (;) MUST NOT appear in the serialization.
 * > If they are required, they must be percent-encoded
 * > as "%27", "%2A", "%2C" or "%3B", respectively.
 */
function checkSerializedOrigin(token: Token) {
	const url = parseUrl(token.value);

	log('Parse URL: "%s" => %O', token.value, url);

	if (!url) {
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

	if (url.search) {
		return token.unmatched({
			reason: 'extra-token',
			extra: { type: 'common', value: 'query' },
			partName: 'serialized-origin',
		});
	}

	if (url.hash) {
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

	if (!token.value.includes(url.host)) {
		return token.unmatched({
			reason: 'must-be-serialized',
			partName: 'serialized-origin',
		});
	}

	if (token.includes("'")) {
		return token.unmatched({
			expects: [{ type: 'const', value: '%27' }],
			reason: 'must-be-percent-encoded',
			partName: 'serialized-origin',
		});
	}

	if (token.includes('*')) {
		return token.unmatched({
			expects: [{ type: 'const', value: '%2A' }],
			reason: 'must-be-percent-encoded',
			partName: 'serialized-origin',
		});
	}

	if (token.includes(',')) {
		return token.unmatched({
			expects: [{ type: 'const', value: '%2C' }],
			reason: 'must-be-percent-encoded',
			partName: 'serialized-origin',
		});
	}

	if (token.includes(';')) {
		return token.unmatched({
			expects: [{ type: 'const', value: '%3B' }],
			reason: 'must-be-percent-encoded',
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
