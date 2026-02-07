/**
 * CSS syntax overrides for css-tree's built-in definitions.
 *
 * Provides alternative syntax definitions for CSS transform functions
 * and legacy value types to support SVG attribute validation where
 * the standard CSS syntax is too strict.
 */
export const cssOverrides: Record<string, string> = {
	// Alias
	'legacy-length-percentage': '<length> | <percentage> | <svg-length>',
	'legacy-angle': '<angle> | <zero> | <number>',

	/**
	 * @see https://www.w3.org/TR/css-transforms-1/#funcdef-transform-translate
	 */
	'translate()':
		'translate( <legacy-length-percentage> , <legacy-length-percentage>? ) | translate( <legacy-length-percentage> <legacy-length-percentage>? )',

	/**
	 * @see https://www.w3.org/TR/css-transforms-1/#funcdef-transform-scale
	 */
	'scale()': 'scale( [ <number> | <percentage> ]#{1,2} )',

	/**
	 * @see https://www.w3.org/TR/css-transforms-1/#funcdef-transform-rotate
	 */
	'rotate()': 'rotate( <legacy-angle> )',

	/**
	 * @see https://www.w3.org/TR/css-transforms-1/#funcdef-transform-skew
	 */
	'skew()': 'skew( <legacy-angle> , <legacy-angle>? ) | skew( <legacy-angle> <legacy-angle>? )',
};
