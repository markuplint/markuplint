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

	if (spec.type === 'String') {
		// Valid because any string value is acceptable
		if (!spec.enum) {
			return false;
		}

		// has "enum"
		const valid = spec.enum.includes(value.toLowerCase().trim());
		if (valid) {
			return false;
		}
		return {
			invalidType: 'invalid-value',
			message: `The "${name}" attribute expect either "${spec.enum.join('", "')}"`,
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
		const i = parseInt(value);
		if (intCheck(value) && 0 < i && i <= 1000) {
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
		const i = parseInt(value);
		if (intCheck(value) && 0 <= i && i <= 65534) {
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
		/**
		 * @see https://html.spec.whatwg.org/multipage/urls-and-fetching.html#valid-url-potentially-surrounded-by-spaces
		 */
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
		/**
		 * @see https://html.spec.whatwg.org/multipage/urls-and-fetching.html#valid-url-potentially-surrounded-by-spaces
		 */
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
