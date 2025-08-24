import type { Defs } from './types.js';

import { checkMultiTypes } from './check-multi-types.js';
import { getCandidate } from './get-candidate.js';
import { matched, matches, unmatched } from './match-result.js';
import { splitUnit, isFloat, isUint, isInt } from './primitive/index.js';
import { isBCP47 } from './rfc/is-bcp-47.js';
import { Token, TokenCollection } from './token/index.js';
import { checkSerializedPermissionsPolicy } from './w3c/check-serialized-permissions-policy.js';
import { checkAutoComplete } from './whatwg/check-autocomplete.js';
import { checkDateTime } from './whatwg/check-datetime/index.js';
import { checkMIMEType } from './whatwg/check-mime-type.js';
import { isAbsURL } from './whatwg/is-abs-url.js';
import { isBrowserContextName } from './whatwg/is-browser-context-name.js';
import { isCustomElementName } from './whatwg/is-custom-element-name.js';
import { isItempropName } from './whatwg/is-itemprop-name.js';
import { isNavigableTargetName } from './whatwg/is-navigable-target-name.js';

export const defs: Defs = {
	Any: {
		ref: '',
		is: () => matched(),
	},

	NoEmptyAny: {
		ref: '',
		is: value => (value.length > 0 ? matched() : unmatched(value, 'empty-token')),
	},

	OneLineAny: {
		ref: '',
		is: value => {
			const tokens = new TokenCollection(value);
			/**
			 * @see https://infra.spec.whatwg.org/#ascii-tab-or-newline
			 */
			const newline = ['\u000A', '\u000D'];
			const newlineToken = tokens.search(newline);
			if (newlineToken) {
				return newlineToken.unmatched({
					reason: 'unexpected-newline',
				});
			}
			return matched();
		},
	},

	Zero: {
		ref: '',
		expects: [
			{
				type: 'common',
				value: 'zero',
			},
		],
		is: value => (value === '0' ? matched() : unmatched(value, 'syntax-error')),
	},

	Number: {
		ref: '',
		expects: [
			{
				type: 'common',
				value: 'number',
			},
		],
		is: value => (isFloat(value) ? matched() : unmatched(value, 'unexpected-token')),
	},

	Int: {
		ref: '',
		expects: [
			{
				type: 'common',
				value: 'integer',
			},
		],
		is: value => (isInt(value) ? matched() : unmatched(value, 'unexpected-token')),
	},

	Uint: {
		ref: '',
		expects: [
			{
				type: 'common',
				value: 'non-negative integer',
			},
		],
		is: value => (isUint(value) ? matched() : unmatched(value, 'unexpected-token')),
	},

	JSON: {
		ref: '',
		expects: [
			{
				type: 'format',
				value: 'JSON',
			},
		],
		is: value => {
			try {
				JSON.parse(value);
			} catch {
				return unmatched(value, 'syntax-error');
			}
			return matched();
		},
	},

	XMLName: {
		ref: 'https://www.w3.org/TR/xml/#NT-Name',
		expects: [
			{
				type: 'format',
				value: 'XML name',
			},
		],
		is: value => {
			/**
			 * NameStartChar ::= ":" | [A-Z] | "_" | [a-z] | [#xC0-#xD6] | [#xD8-#xF6] | [#xF8-#x2FF] | [#x370-#x37D] | [#x37F-#x1FFF] | [#x200C-#x200D] | [#x2070-#x218F] | [#x2C00-#x2FEF] | [#x3001-#xD7FF] | [#xF900-#xFDCF] | [#xFDF0-#xFFFD] | [#x10000-#xEFFFF]
			 * NameChar ::= NameStartChar | "-" | "." | [0-9] | #xB7 | [#x0300-#x036F] | [#x203F-#x2040]
			 * Name ::= NameStartChar (NameChar)*
			 */
			const name =
				// eslint-disable-next-line no-misleading-character-class
				/[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u{10000}-\u{EFFFF}][\d.\u00B7\u0300-\u036F\u203F\u2040-]*/u;
			return name.test(value) ? matched() : unmatched(value, 'unexpected-token');
		},
	},

	DOMID: {
		ref: 'https://html.spec.whatwg.org/multipage/dom.html#global-attributes:concept-id',
		expects: [
			{
				type: 'format',
				value: 'ID',
			},
		],
		is: value => {
			const tokens = new TokenCollection(value);
			const ws = tokens.search(Token.WhiteSpace);
			if (ws) {
				return ws.unmatched({
					reason: 'unexpected-space',
				});
			}
			if (tokens.length === 0) {
				return unmatched(value, 'empty-token');
			}
			return matched();
		},
	},

	FunctionBody: {
		ref: '',
		expects: [
			{
				type: 'syntax',
				value: 'JavaScript',
			},
		],
		// **NO IMPLEMENT PLAN NOW**
		is: () => matched(),
	},

	Pattern: {
		ref: 'https://html.spec.whatwg.org/multipage/input.html#compiled-pattern-regular-expression',
		expects: [
			{
				type: 'common',
				value: 'regular expression',
			},
		],
		is: value => {
			try {
				new RegExp(`^(?:${value})$`);
			} catch {
				return unmatched(value);
			}
			return matched();
		},
	},

	DateTime: {
		ref: 'https://html.spec.whatwg.org/multipage/text-level-semantics.html#datetime-value',
		expects: [
			{
				type: 'format',
				value: 'date time',
			},
		],
		is: checkDateTime(),
	},

	/**
	 * It doesn't check the meaningless number less than -1
	 * that is the same as -1.
	 * It is another rule.
	 */
	TabIndex: {
		expects: [
			{
				type: 'common',
				value: '-1',
			},
			{
				type: 'common',
				value: '0',
			},
			{
				type: 'common',
				value: 'non-negative integer',
			},
		],
		ref: 'https://html.spec.whatwg.org/multipage/interaction.html#attr-tabindex',
		is: matches(value => isInt(value)),
	},

	BCP47: {
		expects: [
			{
				type: 'format',
				value: 'BCP47',
			},
		],
		ref: 'https://tools.ietf.org/rfc/bcp/bcp47.html',
		is: matches(isBCP47(), { reason: 'unexpected-token' }),
	},

	/**
	 * **NO IMPLEMENT NEVER**
	 *
	 * We can evaluate the absolute URL through WHATWG API,
	 * but it isn't easy to check the relative URL.
	 * And the relative URL expects almost all of the characters.
	 * In short, this checking is meaningless.
	 *
	 * So it always returns the matched object.
	 *
	 * If you want to expect the URL without multi-byte characters,
	 * it should use another rule.
	 */
	URL: {
		ref: 'https://html.spec.whatwg.org/multipage/urls-and-fetching.html#valid-url-potentially-surrounded-by-spaces',
		is: () => matched(),
	},

	/**
	 * Fail if it inclides "data" or "javascript" scheme.
	 *
	 * > If any of the following are true:
	 * >   urlRecord is failure;
	 * >     urlRecord's scheme is "data" or "javascript"; or
	 * >     running Is base allowed for Document? on urlRecord and document returns "Blocked",
	 * >     then set element's frozen base URL to document's fallback base URL and return.
	 */
	BaseURL: {
		ref: 'https://html.spec.whatwg.org/multipage/semantics.html#set-the-frozen-base-url',
		is(value) {
			value = value.toLowerCase().trim();
			if (value.startsWith('data:') || value.startsWith('javascript:')) {
				return unmatched(value, 'unexpected-token');
			}
			return matched();
		},
	},

	AbsoluteURL: {
		ref: 'https://url.spec.whatwg.org/#syntax-url-absolute',
		is: matches(isAbsURL()),
	},

	HashName: {
		ref: 'https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-hash-name-reference',
		expects: [
			{
				type: 'format',
				value: 'hash name',
			},
		],
		is: value => (value[0] === '#' ? matched() : unmatched(value, 'unexpected-token')),
	},

	OneCodePointChar: {
		ref: 'https://html.spec.whatwg.org/multipage/interaction.html#the-accesskey-attribute',
		expects: [
			{
				type: 'common',
				value: 'one code point character',
			},
		],
		is: value => (value.length === 1 ? matched() : unmatched(value, 'unexpected-token')),
	},

	CustomElementName: {
		ref: 'https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name',
		expects: [
			{
				type: 'format',
				value: 'custom element name',
			},
		],
		is: matches(isCustomElementName()),
	},

	NavigableTargetName: {
		ref: 'https://html.spec.whatwg.org/multipage/document-sequences.html#valid-navigable-target-name',
		expects: [
			{
				type: 'common',
				value: 'navigable target name',
			},
		],
		// <iframe name="[HERE]">
		is: matches(isNavigableTargetName()),
	},

	/**
	 * @deprecated Use {@link types.NavigableTargetName} instead.
	 */
	BrowsingContextName: {
		ref: 'https://html.spec.whatwg.org/multipage/browsers.html#browsing-context-names',
		expects: [
			{
				type: 'common',
				value: 'browsing context name',
			},
		],
		is: matches(isBrowserContextName()),
	},

	NavigableTargetNameOrKeyword: {
		ref: 'https://html.spec.whatwg.org/multipage/document-sequences.html#valid-navigable-target-name-or-keyword',
		expects: [
			{ type: 'const', value: '_blank' },
			{ type: 'const', value: '_self' },
			{ type: 'const', value: '_parent' },
			{ type: 'const', value: '_top' },
			{
				type: 'common',
				value: 'navigable target name',
			},
		],
		// <a target="[HERE]">
		is(value) {
			value = value.toLowerCase();
			const keywords = ['_blank', '_self', '_parent', '_top'];
			if (keywords.includes(value)) {
				return matched();
			}
			if (value[0] === '_') {
				const candidate = getCandidate(value, keywords);
				return unmatched(value, 'unexpected-token', { candidate });
			}
			const res = matches(isNavigableTargetName())(value);
			if (!res.matched) {
				// @see https://html.spec.whatwg.org/multipage/semantics.html#get-an-element's-target
				// > If target is not null, and contains an ASCII tab or newline and a U+003C (<), then set target to "_blank".
				return unmatched(value, 'unexpected-token', { fallbackTo: '_blank' });
			}
			return res;
		},
	},

	/**
	 * @deprecated Use {@link types.NavigableTargetNameOrKeyword} instead.
	 */
	BrowsingContextNameOrKeyword: {
		ref: 'https://html.spec.whatwg.org/multipage/browsers.html#valid-browsing-context-name-or-keyword',
		expects: [
			{ type: 'const', value: '_blank' },
			{ type: 'const', value: '_self' },
			{ type: 'const', value: '_parent' },
			{ type: 'const', value: '_top' },
			{
				type: 'common',
				value: 'browsing context name',
			},
		],
		is(value) {
			value = value.toLowerCase();
			const keywords = ['_blank', '_self', '_parent', '_top'];
			if (keywords.includes(value)) {
				return matched();
			}
			if (value[0] === '_') {
				const candidate = getCandidate(value, keywords);
				return unmatched(value, 'unexpected-token', { candidate });
			}
			return matches(isBrowserContextName())(value);
		},
	},

	HTTPSchemaURL: {
		ref: 'https://html.spec.whatwg.org/multipage/links.html#ping',
		expects: [
			{
				type: 'format',
				value: 'URL who schema is an HTTP(S) schema',
			},
		],
		is(value) {
			if (isAbsURL()(value)) {
				return unmatched(value, 'unexpected-token');
			}
			if (/^https?/i.test(value)) {
				return matched();
			}
			return unmatched(value, 'unexpected-token', {
				expects: [
					{
						type: 'format',
						value: 'HTTP(S) schema',
					},
				],
			});
		},
	},

	MIMEType: {
		ref: 'https://mimesniff.spec.whatwg.org/#valid-mime-type',
		expects: [
			{
				type: 'format',
				value: 'MIME Type',
			},
		],
		is: checkMIMEType(),
	},

	ItemProp: {
		ref: 'https://html.spec.whatwg.org/multipage/microdata.html#names:-the-itemprop-attribute',
		expects: [
			{
				type: 'common',
				value: 'absolute URL',
			},
			{
				type: 'format',
				value: 'property name',
			},
		],
		is(value) {
			const _matched = matched();
			const _unmatched = unmatched(value, 'unexpected-token');
			return checkMultiTypes(value, [
				value => (isAbsURL()(value) ? _matched : _unmatched),
				value => (isItempropName()(value) ? _matched : _unmatched),
			]);
		},
	},

	Srcset: {
		ref: 'https://html.spec.whatwg.org/multipage/images.html#srcset-attributes',
		is(value) {
			const images = value.split(',');

			for (const image of images) {
				// image candidate string
				const [url, , descriptor, ...tail] = new TokenCollection(image.trim(), {
					disallowToSurroundBySpaces: true,
					separator: 'space',
				});

				if (!url) {
					return unmatched(value, 'unexpected-token', {
						expects: [
							{
								type: 'format',
								value: 'valid non-empty URL',
							},
						],
					});
				}

				if (descriptor) {
					const { num, unit } = splitUnit(descriptor.value);
					switch (unit) {
						case 'w': {
							if (!isUint(num)) {
								return unmatched(value, 'unexpected-token', {
									expects: [
										{
											type: 'format',
											value: 'width descriptor',
										},
									],
								});
							}
							break;
						}
						case 'x': {
							if (!isFloat(num)) {
								return unmatched(value, 'unexpected-token', {
									expects: [
										{
											type: 'format',
											value: 'pixel density descriptor',
										},
									],
								});
							}
							break;
						}
						default: {
							return unmatched(value, 'unexpected-token', {
								expects: [
									{
										type: 'format',
										value: 'width descriptor',
									},
									{
										type: 'format',
										value: 'pixel density descriptor',
									},
								],
							});
						}
					}
				}

				if (tail[0]) {
					return unmatched(value, 'unexpected-token', {
						expects: [
							{
								type: 'syntax',
								value: 'image candidate string',
							},
						],
					});
				}
			}

			return matched();
		},
	},

	SourceSizeList: {
		ref: 'https://html.spec.whatwg.org/multipage/images.html#sizes-attributes',
		expects: [
			{
				type: 'syntax',
				value: '<source-size-list>',
			},
		],
		syntax: {
			apply: '<source-size-list>',
			def: {
				'source-size-list': '[ <source-size># , ]? <source-size-value>',
				'source-size': '<media-condition> <source-size-value> | auto',
				/**
				 * > Percentages are not allowed in a `<source-size-value>`,
				 * > to avoid confusion about what it would be relative to.
				 * > The 'vw' unit can be used for sizes relative to the viewport width.
				 *
				 * `<length>` doesn't allow percentages.
				 * @see https://csstree.github.io/docs/syntax/#Type:length
				 */
				'source-size-value': '<length> | auto',
			},
		},
	},

	IconSize: {
		ref: 'https://html.spec.whatwg.org/multipage/semantics.html#attr-link-sizes',
		expects: [
			{
				type: 'const',
				value: 'any',
			},
			{
				type: 'syntax',
				value: '[WIDTH]x[HEIGHT]',
			},
		],
		is(value) {
			value = value.toLowerCase();
			if (value === 'any') {
				return matched();
			}
			const tokens = new TokenCollection(value, { specificSeparator: 'x' });
			const [width, sep, height, ...tail] = tokens;
			if (!width) {
				return unmatched(value, 'unexpected-token');
			}
			if (!sep) {
				return width.unmatched({ reason: 'unexpected-token' });
			}
			if (!height) {
				return sep.unmatched({ reason: 'unexpected-token' });
			}
			if (tail[0]) {
				return tail[0].unmatched({ reason: 'extra-token' });
			}
			if (!isUint(width.value)) {
				return width.unmatched({ reason: 'unexpected-token' });
			}
			if (width.value === '0') {
				return width.unmatched({ reason: 'out-of-range' });
			}
			if (sep.value !== 'x') {
				return sep.unmatched({ reason: 'out-of-range' });
			}
			if (!isUint(height.value)) {
				return height.unmatched({ reason: 'unexpected-token' });
			}
			if (height.value === '0') {
				return height.unmatched({ reason: 'out-of-range' });
			}
			return matched();
		},
	},

	AutoComplete: {
		ref: 'https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete',
		is: checkAutoComplete(),
	},

	Accept: {
		ref: 'https://html.spec.whatwg.org/multipage/input.html#attr-input-accept',
		expects: [
			{
				type: 'const',
				value: 'audio/*',
			},
			{
				type: 'const',
				value: 'video/*',
			},
			{
				type: 'const',
				value: 'image/*',
			},
			{
				type: 'format',
				value: 'MIME Type',
			},
			{
				type: 'format',
				value: 'Extension',
			},
		],
		// input[type=file] accept: { type: { token: "Accept", "separator": "comma" } }
		is(value) {
			const extMap = ['audio/*', 'video/*', 'image/*'];
			if (extMap.includes(value)) return matched();
			// A valid MIME type string with no parameters
			const mimeMatched = checkMIMEType({ withoutParameters: true })(value);
			if (mimeMatched.matched) return matched();
			// A string whose first character is a U+002E FULL STOP character (.)
			return value[0] === '.' && value[1] ? matched() : mimeMatched;
		},
	},

	SerializedPermissionsPolicy: {
		ref: 'https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy',
		is: checkSerializedPermissionsPolicy(),
	},

	ValidCustomCommand: {
		ref: 'https://html.spec.whatwg.org/multipage/form-elements.html#valid-custom-command',
		is(value) {
			const isValid = /^--.+/.test(value);
			return isValid
				? matched()
				: unmatched(value, 'typo', {
						candidate: `--${value}`,
						expects: [
							{
								type: 'format',
								value: 'custom command',
							},
						],
					});
		},
	},
};
