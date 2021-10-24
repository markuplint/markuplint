import { Attribute as AttrSpec } from '@markuplint/ml-spec';

type Invalid = {
	invalidType: 'non-existent' | 'invalid-value';
	message: string;
};

export function typeCheck(name: string, value: string, isCustomRule: boolean, spec?: AttrSpec): Invalid | false {
	if (!isCustomRule) {
		if (/^data-.+$/.test(name)) {
			// Ignore checking because "data-*" attribute is any type
			return false;
		}

		if (/^aria-.+$|^role$/.test(name)) {
			// Ignore checking because ARIA attributes are check on another rule
			return false;
		}
	}

	// Existance
	if (!spec) {
		return {
			invalidType: 'non-existent',
			message: `The "${name}" attribute is not allowed`,
		};
	}

	// Valid because any string value is acceptable
	if (typeof spec.type !== 'string' && 'enum' in spec.type) {
		// has "enum"
		const valid = spec.type.enum.includes(value.toLowerCase().trim());
		if (valid) {
			return false;
		}
		return {
			invalidType: 'invalid-value',
			message: `The "${name}" attribute expect either "${spec.type.enum.join('", "')}"`,
		};
	}

	if (spec.type === 'NonEmptyString' && value === '') {
		return {
			invalidType: 'invalid-value',
			message: `The "${name}" attribute value must not be the empty string`,
		};
	}

	if (spec.type === 'Boolean') {
		// Valid because an attribute is exist
		return false;
	}

	if (spec.type === 'Function') {
		// TODO: To eval function-body string
		return false;
	}

	if (spec.type === 'Date') {
		// TODO: https://html.spec.whatwg.org/multipage/text-level-semantics.html#datetime-value
		return false;
	}

	if (spec.type === 'Int') {
		if (intCheck(value)) {
			return false;
		}
		return {
			invalidType: 'invalid-value',
			message: `The "${name}" attribute expect integer`,
		};
	}

	if (spec.type === 'Uint') {
		if (uintCheck(value)) {
			return false;
		}
		return {
			invalidType: 'invalid-value',
			message: `The "${name}" attribute expect non-negative integer`,
		};
	}

	if (spec.type === 'Float') {
		if (floatCheck(value)) {
			return false;
		}
		return {
			invalidType: 'invalid-value',
			message: `The "${name}" attribute expect floating-point number`,
		};
	}

	if (spec.type === 'NonZeroUint') {
		if (nonZeroUintCheck(value)) {
			return false;
		}
		return {
			invalidType: 'invalid-value',
			message: `The "${name}" attribute expect floating-point number`,
		};
	}

	if (spec.type === 'ZeroToOne') {
		if (range(value, 0, 1)) {
			return false;
		}
		return {
			invalidType: 'invalid-value',
			message: `The "${name}" attribute expect in the range between zero and one`,
		};
	}

	if (spec.type === 'AcceptList') {
		// TODO: https://html.spec.whatwg.org/multipage/input.html#attr-input-accept
		return false;
	}

	if (spec.type === 'AutoComplete') {
		// TODO: https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-detail-tokens
		return false;
	}

	if (spec.type === 'BCP47') {
		// TODO: https://tools.ietf.org/html/bcp47
		return false;
	}

	if (spec.type === 'Color') {
		// TODO: https://drafts.csswg.org/css-color/#typedef-color
		return false;
	}

	if (spec.type === 'ColSpan') {
		/**
		 * > value must be a valid non-negative integer greater than zero and less than or equal to 1000.
		 *
		 * @see https://html.spec.whatwg.org/multipage/tables.html#attr-tdth-colspan
		 */
		if (intCheck(value) && range(value, 0, 1000)) {
			return false;
		}
		return {
			invalidType: 'invalid-value',
			message: `The "${name}" attribute expect non-negative integer greater than zero and less than or equal to 1000`,
		};
	}

	if (spec.type === 'Coords') {
		// TODO: https://html.spec.whatwg.org/multipage/image-maps.html#attr-area-coords
		return false;
	}

	if (spec.type === 'Crossorigin') {
		// TODO: https://html.spec.whatwg.org/multipage/urls-and-fetching.html#cors-settings-attributes
		return false;
	}

	if (spec.type === 'DateTime') {
		// TODO: https://html.spec.whatwg.org/multipage/text-level-semantics.html#datetime-value
		return false;
	}

	if (spec.type === 'Destination') {
		// TODO: https://html.spec.whatwg.org/multipage/semantics.html#attr-link-as
		return false;
	}

	if (spec.type === 'DOMID') {
		// TODO: Searching ID in Document
		return false;
	}

	if (spec.type === 'DOMIDList') {
		// TODO: Searching ID in Document
		return false;
	}

	if (spec.type === 'IRI') {
		// TODO: https://developer.mozilla.org/ja/docs/Web/SVG/Content_type#iri
		return false;
	}

	if (spec.type === 'ItemType') {
		// TODO: https://html.spec.whatwg.org/multipage/microdata.html#attr-itemtype
		return false;
	}

	if (spec.type === 'LinkSizes') {
		// TODO: https://html.spec.whatwg.org/multipage/semantics.html#attr-link-sizes
		return false;
	}

	if (spec.type === 'LinkType') {
		// TODO: https://html.spec.whatwg.org/multipage/links.html#linkTypes
		return false;
	}

	if (spec.type === 'LinkTypeList') {
		// TODO: https://html.spec.whatwg.org/multipage/links.html#linkTypes
		return false;
	}

	if (spec.type === 'MediaQuery') {
		// TODO: https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-media-query-list
		return false;
	}

	if (spec.type === 'MediaQueryList') {
		// TODO: https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-media-query-list
		return false;
	}

	if (spec.type === 'MIMEType') {
		// TODO: https://mimesniff.spec.whatwg.org/#valid-mime-type
		return false;
	}

	if (spec.type === 'ReferrerPolicy') {
		/**
		 * @see https://html.spec.whatwg.org/multipage/urls-and-fetching.html#referrer-policy-attributes
		 */
		const enumValues = [
			'',
			'no-referrer',
			'no-referrer-when-downgrade',
			'same-origin',
			'origin',
			'strict-origin',
			'origin-when-cross-origin',
			'strict-origin-when-cross-origin',
			'unsafe-url',
		];
		const valid = enumValues.includes(value.toLowerCase());
		if (valid) {
			return false;
		}
		return {
			invalidType: 'invalid-value',
			message: `The "${name}" attribute expect either "${enumValues.join('", "')}"`,
		};
	}

	if (spec.type === 'RowSpan') {
		/**
		 * > value must be a valid non-negative integer less than or equal to 65534.
		 *
		 * @see https://html.spec.whatwg.org/multipage/tables.html#attr-tdth-rowspan
		 */
		if (intCheck(value) && range(value, 0, 65534)) {
			return false;
		}
		return {
			invalidType: 'invalid-value',
			message: `The "${name}" attribute expect non-negative integer less than or equal to 65534`,
		};
	}

	if (spec.type === 'SourceSizeList') {
		// TODO: https://html.spec.whatwg.org/multipage/images.html#sizes-attributes
		return false;
	}

	if (spec.type === 'SrcSet') {
		// TODO: https://html.spec.whatwg.org/multipage/images.html#srcset-attribute
		return false;
	}

	if (spec.type === 'TabIndex') {
		/**
		 * > ## omitted (or non-integer values)
		 * >
		 * > The user agent will decide whether the element is focusable, and if it is, whether it is sequentially focusable or click focusable (or both).
		 * >
		 * > ## −1 (or other negative integer values)
		 * >
		 * > Causes the element to be focusable, and indicates that the author would prefer the element to be click focusable but not sequentially focusable. The user agent might ignore this preference for click and sequential focusability, e.g., for specific element types according to platform conventions, or for keyboard-only users.
		 * >
		 * > ## 0
		 * >
		 * > Causes the element to be focusable, and indicates that the author would prefer the element to be both click focusable and sequentially focusable. The user agent might ignore this preference for click and sequential focusabiity.
		 * >
		 * > ## positive integer values
		 * >
		 * > Behaves the same as 0, but in addition creates a relative ordering within a tabindex-ordered focus navigation scope, so that elements with higher tabindex attribute value come later.
		 *
		 * @see https://html.spec.whatwg.org/multipage/interaction.html#attr-tabindex
		 */
		if (intCheck(value)) {
			const i = parseInt(value);
			if (-1 <= i) {
				return false;
			}
			if (-1 > i) {
				return {
					invalidType: 'invalid-value',
					message: 'Value is ​​less than -1 behave the same as -1',
				};
			}
		}
		return {
			invalidType: 'invalid-value',
			message: `The "${name}" attribute expect either -1, 0, positive integer`,
		};
	}

	if (spec.type === 'Target') {
		// TODO: https://html.spec.whatwg.org/multipage/links.html#attr-hyperlink-target
		return false;
	}

	if (spec.type === 'URL') {
		// TODO: https://html.spec.whatwg.org/multipage/urls-and-fetching.html#valid-url-potentially-surrounded-by-spaces
		return false;
	}

	if (spec.type === 'URLHash') {
		/**
		 * https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-hash-name-reference
		 */
		const valid = value[0] === '#';
		if (valid) {
			return false;
		}
		return {
			invalidType: 'invalid-value',
			message: `The "${name}" attribute expect valid hash name reference`,
		};
	}

	if (spec.type === 'URLList') {
		// TODO: https://html.spec.whatwg.org/multipage/urls-and-fetching.html#valid-url-potentially-surrounded-by-spaces
		return false;
	}

	if (spec.type === 'CSSAngle') {
		// TODO: https://developer.mozilla.org/en-US/docs/Web/CSS/angle
		return false;
	}

	if (spec.type === 'CSSBlendMode') {
		// TODO: https://developer.mozilla.org/en-US/docs/Web/CSS/blend-mode
		return false;
	}

	if (spec.type === 'CSSClipPath') {
		// TODO: https://developer.mozilla.org/en-US/docs/Web/CSS/clip-path
		return false;
	}

	if (spec.type === 'CSSCustomIdent') {
		// TODO: https://developer.mozilla.org/en-US/docs/Web/CSS/custom-ident
		return false;
	}

	if (spec.type === 'CSSDisplay') {
		// TODO: https://developer.mozilla.org/en-US/docs/Web/CSS/display
		return false;
	}

	if (spec.type === 'CSSFilter') {
		// TODO: https://developer.mozilla.org/en-US/docs/Web/CSS/filter
		return false;
	}

	if (spec.type === 'CSSFontFamily') {
		// TODO: https://developer.mozilla.org/en-US/docs/Web/CSS/font-family
		return false;
	}

	if (spec.type === 'CSSFontSize') {
		// TODO: https://developer.mozilla.org/en-US/docs/Web/CSS/font-size
		return false;
	}

	if (spec.type === 'CSSFontVariant') {
		// TODO: https://developer.mozilla.org/en-US/docs/Web/CSS/font-variant
		return false;
	}

	if (spec.type === 'CSSFontWeight') {
		// TODO: https://developer.mozilla.org/en-US/docs/Web/CSS/font-weight
		return false;
	}

	if (spec.type === 'CSSMask') {
		// TODO: https://developer.mozilla.org/en-US/docs/Web/CSS/mask
		return false;
	}

	if (spec.type === 'CSSOpacity') {
		// TODO: https://developer.mozilla.org/en-US/docs/Web/CSS/opacity
		return false;
	}

	if (spec.type === 'CSSTextDecoration') {
		// TODO: https://developer.mozilla.org/en-US/docs/Web/CSS/text-decoration
		return false;
	}

	if (spec.type === 'CSSTransformList') {
		// TODO: https://developer.mozilla.org/en-US/docs/Web/CSS/transform-function
		return false;
	}

	if (spec.type === 'CSSTransformOrigin') {
		// TODO: https://developer.mozilla.org/en-US/docs/Web/CSS/transform-origin
		return false;
	}

	if (spec.type === 'CSSURL') {
		// TODO: https://www.w3.org/TR/css3-values/#url-value
		return false;
	}

	if (spec.type === 'SVGAngle') {
		// TODO: https://developer.mozilla.org/en-US/docs/Web/SVG/Content_type#angle
		return false;
	}

	if (spec.type === 'SVGAnimatableValue') {
		// TODO
		/**
		 * The exact value type for this attribute depends on the value of the attribute
		 * that will be animated.
		 *
		 * ```svg
		 * <rect x="10" y="10" height="100">
		 *   <animate attributeName="width" fill="freeze" from="100" to="150" dur="3s"/>
		 * </rect>
		 * ```
		 *
		 * The `from` and `to` attributes of the `animate` element are SVGAnimatableValue.
		 */
		return false;
	}

	if (spec.type === 'SVGBeginValueList') {
		// TODO: https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/begin
		return false;
	}

	if (spec.type === 'SVGClockValue') {
		// TODO: https://developer.mozilla.org/en-US/docs/Web/SVG/Content_type#clock-value
		return false;
	}

	if (spec.type === 'SVGColorMatrix') {
		// TODO: https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feColorMatrix
		return false;
	}

	if (spec.type === 'SVGDashArray') {
		// TODO: https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-dasharray
		return false;
	}

	if (spec.type === 'SVGEndValueList') {
		// TODO: https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/end
		return false;
	}

	if (spec.type === 'SVGFilterPrimitiveReference') {
		// TODO: https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/result#usage_notes
		return false;
	}

	if (spec.type === 'SVGKernelMatrix') {
		// TODO: https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/kernelMatrix
		return false;
	}

	if (spec.type === 'SVGKeyPoints') {
		// TODO: https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/keyPoints
		return false;
	}

	if (spec.type === 'SVGKeySplines') {
		// TODO: https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/keySplines
		return false;
	}

	if (spec.type === 'SVGKeyTimes') {
		// TODO: https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/keyTimes
		return false;
	}

	if (spec.type === 'SVGLanguageTags') {
		/**
		 * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/systemLanguage
		 */
		// TODO: List of BCP47
		return false;
	}

	if (spec.type === 'SVGLength') {
		// TODO: https://developer.mozilla.org/en-US/docs/Web/SVG/Content_type#length
		return false;
	}

	if (spec.type === 'SVGLengthList') {
		/**
		 * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Content_type#length
		 */
		// TODO: List of SVGLength
		return false;
	}

	if (spec.type === 'SVGNumberList') {
		// TODO: https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/tableValues#usage_notes
		return false;
	}

	if (spec.type === 'SVGNumberOptionalNumber') {
		// TODO: https://developer.mozilla.org/en-US/docs/Web/SVG/Content_type#number-optional-number
		return false;
	}

	if (spec.type === 'SVGPaint') {
		// TODO: https://developer.mozilla.org/en-US/docs/Web/SVG/Content_type#paint
		return false;
	}

	if (spec.type === 'SVGPathCommands') {
		// TODO: https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/d#path_commands
		return false;
	}

	if (spec.type === 'SVGPercentage') {
		// TODO: https://developer.mozilla.org/en-US/docs/Web/SVG/Content_type#percentage
		return false;
	}

	if (spec.type === 'SVGPercentageList') {
		/**
		 * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Content_type#percentage
		 */
		// TODO: List of SVGPercentage
		return false;
	}

	if (spec.type === 'SVGPoints') {
		// TODO: https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/points
		return false;
	}

	if (spec.type === 'SVGPreserveAspectRatio') {
		// TODO: https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/preserveAspectRatio
		return false;
	}

	if (spec.type === 'SVGViewBox') {
		// TODO: https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/viewBox
		return false;
	}

	return false;
}

/**
 * @see https://html.spec.whatwg.org/dev/common-microsyntaxes.html#signed-integers
 *
 * @param value
 */
export function intCheck(value: string) {
	return /^-?[0-9]+$/.test(value);
}

/**
 * @see https://html.spec.whatwg.org/dev/common-microsyntaxes.html#non-negative-integers
 *
 * @param value
 */
export function uintCheck(value: string) {
	return /^[0-9]+$/.test(value);
}

/**
 * @see https://html.spec.whatwg.org/dev/common-microsyntaxes.html#floating-point-numbers
 *
 * @param value
 */
export function floatCheck(value: string) {
	return value === value.trim() && Number.isFinite(parseFloat(value));
}

/**
 * Non-negative integer greater than zero
 *
 * @param value
 */
export function nonZeroUintCheck(value: string) {
	return /^[0-9]+$/.test(value) && !/^0+$/.test(value);
}

/**
 * It is in the range between `from` and `to`.
 *
 * @param value
 * @param from
 * @param to
 */
export function range(value: string, from: number, to: number) {
	const num = parseFloat(value);
	if (isNaN(num)) {
		return false;
	}
	return from <= num && num <= to;
}
