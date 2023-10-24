export const MASK_CHAR = '\uE000';

/**
 * SVG Element list
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Element
 */
export const svgElementList = [
	'a',
	'animate',
	'animateMotion',
	'animateTransform',
	'circle',
	'clipPath',
	'defs',
	'desc',
	'discard',
	'ellipse',
	'feBlend',
	'feColorMatrix',
	'feComponentTransfer',
	'feComposite',
	'feConvolveMatrix',
	'feDiffuseLighting',
	'feDisplacementMap',
	'feDistantLight',
	'feDropShadow',
	'feFlood',
	'feFuncA',
	'feFuncB',
	'feFuncG',
	'feFuncR',
	'feGaussianBlur',
	'feImage',
	'feMerge',
	'feMergeNode',
	'feMorphology',
	'feOffset',
	'fePointLight',
	'feSpecularLighting',
	'feSpotLight',
	'feTile',
	'feTurbulence',
	'filter',
	'foreignObject',
	'g',
	'hatch',
	'hatchpath',
	'image',
	'line',
	'linearGradient',
	'marker',
	'mask',
	'mesh',
	'meshgradient',
	'meshpatch',
	'meshrow',
	'metadata',
	'mpath',
	'path',
	'pattern',
	'polygon',
	'polyline',
	'radialGradient',
	'rect',
	'script',
	'set',
	'stop',
	'style',
	'svg',
	'switch',
	'symbol',
	'text',
	'textPath',
	'title',
	'tspan',
	'use',
	'view',
	// Below: Obsolete and deprecated elements
	'altGlyph',
	'altGlyphDef',
	'altGlyphItem',
	'animateColor',
	'cursor',
	'font',
	'font-face',
	'font-face-format',
	'font-face-name',
	'font-face-src',
	'font-face-uri',
	'glyph',
	'glyphRef',
	'hkern',
	'missing-glyph',
	'tref',
	'vkern',
];

// eslint-disable-next-line no-control-regex
export const reTagName = /^[a-z][^\u0000\u0009\u000A\u000C />]*/i;

export const reSplitterTag = /<[^>]+>/g;

/**
 * - U+0009 CHARACTER TABULATION (tab) => `\t`
 * - U+000A LINE FEED (LF) => `\n`
 * - U+000C FORM FEED (FF) => `\f`
 * - U+0020 SPACE => ` `
 */
export const defaultSpaces = ['\t', '\n', '\f', ' '] as const;
