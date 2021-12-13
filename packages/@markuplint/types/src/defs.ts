import type { Defs, CssSyntaxTokenizer } from './types';

import { checkMultiTypes } from './check-multi-types';
import { getCandicate } from './get-candicate';
import { matched, matches, unmatched } from './match-result';
import { splitUnit, isFloat, isUint, isInt } from './primitive';
import { isBCP47 } from './rfc/is-bcp-47';
import { Token, TokenCollection } from './token';
import { checkSerializedPermissionsPolicy } from './w3c/check-serialized-permissions-policy';
import { checkAutoComplete } from './whatwg/check-autocomplete';
import { checkDateTime } from './whatwg/check-datetime';
import { checkMIMEType } from './whatwg/check-mime-type';
import { isAbsURL } from './whatwg/is-abs-url';
import { isBrowserContextName } from './whatwg/is-browser-context-name';
import { isCustomElementName } from './whatwg/is-custom-element-name';
import { isItempropName } from './whatwg/is-itemprop-name';

export const types: Defs = {
	Any: {
		ref: '',
		is: () => matched(),
	},

	NoEmptyAny: {
		ref: '',
		is: value => (0 < value.length ? matched() : unmatched(value, 'empty-token')),
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

	XMLName: {
		ref: 'https://www.w3.org/TR/xml/#NT-Name',
		expects: [
			{
				type: 'format',
				value: 'XML name',
			},
		],
		is: value => {
			// NameStartChar ::= ":" | [A-Z] | "_" | [a-z] | [#xC0-#xD6] | [#xD8-#xF6] | [#xF8-#x2FF] | [#x370-#x37D] | [#x37F-#x1FFF] | [#x200C-#x200D] | [#x2070-#x218F] | [#x2C00-#x2FEF] | [#x3001-#xD7FF] | [#xF900-#xFDCF] | [#xFDF0-#xFFFD] | [#x10000-#xEFFFF]
			const nameStartChar =
				/[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u{10000}-\u{EFFFF}]/u;
			// NameChar ::= NameStartChar | "-" | "." | [0-9] | #xB7 | [#x0300-#x036F] | [#x203F-#x2040]
			const nameCharTail = /-|[.0-9\u00B7]|[\u0300-\u036F\u203F-\u2040]/;
			// Name ::= NameStartChar (NameChar)*
			const name = RegExp(`(?:${nameStartChar.source})(?:${nameCharTail})*`, 'u');
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
			if (!tokens.length) {
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

	BrowsingContextName: {
		ref: 'https://html.spec.whatwg.org/multipage/browsers.html#browsing-context-names',
		expects: [
			{
				type: 'common',
				value: 'browsing context name',
			},
		],
		// <iframe name="[HERE]">
		is: matches(isBrowserContextName()),
	},

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
		// <a target="[HERE]">
		is(value) {
			value = value.toLowerCase();
			const keywords = ['_blank', '_self', '_parent', '_top'];
			if (keywords.includes(value)) {
				return matched();
			}
			if (value[0] === '_') {
				const candicate = getCandicate(value, keywords);
				return unmatched(value, 'unexpected-token', { candicate });
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
		syntax: {
			apply: '<srcset>',
			def: {
				srcset: '<image-candidate-strings> [, <image-candidate-strings>]*',
				'image-candidate-strings': '<valid-non-empty-url> [ <width-descriptor> | <pixel-density-descriptor> ]?',
				'valid-non-empty-url'(token, getNextToken) {
					if (!token) {
						return 0;
					}
					let willAdoptTokenLength = 0;
					do {
						if (token.type === 13) {
							break;
						}
						willAdoptTokenLength++;
					} while ((token = getNextToken(willAdoptTokenLength)));
					return willAdoptTokenLength;
				},
				'width-descriptor'(token) {
					if (!token) {
						return 0;
					}
					const { num, unit } = splitUnit(token.value);
					if (unit !== 'w') {
						return 0;
					}
					if (!isUint(num)) {
						return 0;
					}
					return 1;
				},
				'pixel-density-descriptor'(token) {
					if (!token) {
						return 0;
					}
					const { num, unit } = splitUnit(token.value);
					if (unit !== 'x') {
						return 0;
					}
					if (!isFloat(num)) {
						return 0;
					}
					return 1;
				},
			},
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
				'source-size': '<media-condition> <source-size-value>',
				'source-size-value': '<length>',
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
			const tokens = new TokenCollection(value, { speificSeparator: 'x' });
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
			if (tail && tail.length) {
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

	'<css-declaration-list>': {
		ref: 'https://drafts.csswg.org/css-style-attr/#syntax',
		syntax: {
			apply: '<css-declaration-list>',
			def: {
				'css-declaration-list': '<declaration-list>',
			},
		},
	},

	'<class-list>': {
		ref: 'https://www.w3.org/TR/SVG/styling.html#ClassAttribute',
		syntax: {
			apply: '<class-list>',
			def: {
				'class-list': '<ident-token>*',
			},
		},
	},

	'<svg-font-size>': {
		ref: 'https://drafts.csswg.org/css-fonts-5/#descdef-font-face-font-size',
		// TODO:
		is: () => matched(),
	},

	'<svg-font-size-adjust>': {
		ref: 'https://drafts.csswg.org/css-fonts-5/#propdef-font-size-adjust',
		// TODO:
		is: () => matched(),
	},

	"<'color-profile'>": {
		ref: 'https://www.w3.org/TR/SVG11/color.html#ColorProfileProperty',
		// TODO:
		is: () => matched(),
	},

	"<'color-rendering'>": {
		ref: 'https://www.w3.org/TR/SVG11/painting.html#ColorRenderingProperty',
		// TODO:
		is: () => matched(),
	},

	"<'enable-background'>": {
		ref: 'https://www.w3.org/TR/SVG11/filters.html#EnableBackgroundProperty',
		// TODO:
		is: () => matched(),
	},

	'<list-of-svg-feature-string>': {
		ref: 'https://www.w3.org/TR/SVG11/feature.html',
		// TODO:
		is: () => matched(),
	},

	'<animatable-value>': {
		ref: 'https://svgwg.org/specs/animations/#FromAttribute',
		// TODO:
		is: () => matched(),
	},

	'<begin-value-list>': {
		ref: 'https://svgwg.org/specs/animations/#BeginValueListSyntax',
		// TODO:
		is: () => matched(),
	},

	'<end-value-list>': {
		ref: 'https://svgwg.org/specs/animations/#EndValueListSyntax',
		// TODO:
		is: () => matched(),
	},

	'<list-of-value>': {
		ref: 'https://svgwg.org/specs/animations/#ValuesAttribute',
		// TODO:
		is: () => matched(),
	},

	'<clock-value>': {
		ref: 'https://www.w3.org/TR/2001/REC-smil-animation-20010904/#Timing-ClockValueSyntax',
		syntax: {
			// TODO:
			apply: '<clock-value>',
			def: {
				'clock-value': '<any-value>',
			},
		},
	},

	'<color-matrix>': {
		ref: 'https://drafts.fxtf.org/filter-effects/#element-attrdef-fecolormatrix-values',
		syntax: {
			apply: '<color-matrix>',
			def: {
				'color-matrix': '[ <number-zero-one> [,]? ]{19} <number-zero-one>',
			},
		},
	},

	'<dasharray>': {
		ref: 'https://svgwg.org/svg2-draft/painting.html#StrokeDasharrayProperty',
		syntax: {
			apply: '<dasharray>',
			def: {
				dasharray: '[ [ <svg-length> | <percentage> | <number> ]+ ]#',
			},
		},
	},

	'<key-points>': {
		ref: 'https://svgwg.org/specs/animations/#KeyPointsAttribute',
		syntax: {
			apply: '<key-points>',
			def: {
				'key-points': '<number> [; <number>]* [;]?',
			},
		},
	},

	'<key-splines>': {
		ref: 'https://svgwg.org/specs/animations/#KeyTimesAttribute',
		syntax: {
			apply: '<key-splines>',
			def: {
				'key-splines': '<control-point> [; <control-point>]* [;]?',
				'control-point': '<number> [,]? <number> [,]? <number> [,]? <number>',
			},
		},
	},

	'<key-times>': {
		ref: 'https://svgwg.org/specs/animations/#KeyTimesAttribute',
		syntax: {
			apply: '<key-times>',
			def: {
				'key-times': '<number> [; <number>]* [;]?',
			},
		},
	},

	'<system-language>': {
		ref: 'https://svgwg.org/svg2-draft/struct.html#SystemLanguageAttribute',
		syntax: {
			apply: '<system-language>',
			def: {
				'system-language': '<bcp-47>#',
			},
		},
	},

	'<origin>': {
		ref: 'https://www.w3.org/TR/2001/REC-smil-animation-20010904/#MotionOriginAttribute',
		syntax: {
			apply: '<origin>',
			def: {
				origin: 'default',
			},
		},
	},

	'<svg-path>': {
		ref: 'https://svgwg.org/svg2-draft/paths.html#PathDataBNF',
		syntax: {
			apply: '<svg-path>',
			// TODO:
			def: {
				'svg-path': '<any-value>',
			},
		},
	},

	'<points>': {
		ref: 'https://svgwg.org/svg2-draft/shapes.html#DataTypePoints',
		syntax: {
			apply: '<points>',
			def: {
				points: '[ <number>+ ]#',
			},
		},
	},

	'<preserve-aspect-ratio>': {
		ref: 'https://svgwg.org/svg2-draft/coords.html#PreserveAspectRatioAttribute',
		syntax: {
			apply: '<preserve-aspect-ratio>',
			def: {
				'preserve-aspect-ratio': '<align> <meet-or-slice>?',
				align: 'none | xMinYMin | xMidYMin | xMaxYMin | xMinYMid | xMidYMid | xMaxYMid| xMinYMax | xMidYMax | xMaxYMax',
				'meet-or-slice': 'meet | slice',
			},
			// A new spec
			// @see https://drafts.fxtf.org/filter-effects/#element-attrdef-feimage-preserveaspectratio
			// > preserveAspectRatio = "[defer] <align> [<meetOrSlice>]"
		},
	},

	'<view-box>': {
		ref: 'https://svgwg.org/svg2-draft/coords.html#ViewBoxAttribute',
		syntax: {
			apply: '<view-box>',
			def: {
				'view-box': '<min-x> [,]? <min-y> [,]? <width> [,]? <height>', // As '[<min-x>,? <min-y>,? <width>,? <height>]',
				'min-x': '<number>',
				'min-y': '<number>',
				width: '<number>',
				height: '<number>',
			},
		},
	},

	'<rotate>': {
		ref: 'https://svgwg.org/specs/animations/#RotateAttribute',
		syntax: {
			apply: '<rotate>',
			def: {
				rotate: '<number> | auto | auto-reverse',
			},
		},
	},

	'<text-coordinate>': {
		ref: 'https://svgwg.org/svg2-draft/text.html#TSpanAttributes',
		syntax: {
			apply: '<text-coordinate>',
			def: {
				'text-coordinate': '[ [ <svg-length> | <percentage> | <number> ]+ ]#',
			},
		},
	},

	'<list-of-lengths>': {
		ref: 'https://developer.mozilla.org/en-US/docs/Web/SVG/Content_type#list-of-ts',
		syntax: {
			apply: '<list-of-lengths>',
			def: {
				'list-of-lengths': '[ <svg-length> [,]? ]* <svg-length>',
			},
		},
	},

	'<list-of-numbers>': {
		ref: 'https://developer.mozilla.org/en-US/docs/Web/SVG/Content_type#list-of-ts',
		syntax: {
			apply: '<list-of-numbers>',
			def: {
				'list-of-numbers': '[ <number> [,]? ]* <number>',
			},
		},
	},

	'<list-of-percentages>': {
		ref: 'https://developer.mozilla.org/en-US/docs/Web/SVG/Content_type#percentage',
		syntax: {
			apply: '<list-of-percentages>',
			def: {
				'list-of-percentages': '[ <percentage> [,]? ]* <percentage>',
			},
		},
	},

	'<number-optional-number>': {
		ref: 'https://developer.mozilla.org/en-US/docs/Web/SVG/Content_type#number-optional-number',
		syntax: {
			apply: '<number-optional-number>',
			def: {
				'number-optional-number': '<number> | <number> , <number>',
			},
		},
	},
};

export const tokenizers: Record<string, CssSyntaxTokenizer> = {
	// RFC
	// https://tools.ietf.org/rfc/bcp/bcp47.html
	'bcp-47'(token) {
		if (!token) {
			return 0;
		}
		return isBCP47()(token.value) ? 1 : 0;
	},
};
