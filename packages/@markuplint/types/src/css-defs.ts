import { matched } from './match-result.js';
import type { Defs } from './types.js';

export const cssDefs: Defs = {
	'<css-declaration-list>': {
		ref: 'https://drafts.csswg.org/css-style-attr/#syntax',
		syntax: {
			apply: '<css-declaration-list>',
			def: {
				'css-declaration-list': '<declaration-list>',
			},
		},
	},

	// DO NOT USE: Issue #564
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
