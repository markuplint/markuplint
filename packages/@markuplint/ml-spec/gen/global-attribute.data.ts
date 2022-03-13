export const globalAttrs: Record<
	`#${string}Attrs`,
	{
		description: string;
		attrs: string[];
	}
> = {
	'#HTMLGlobalAttrs': {
		description: '[Global attributes]( https://html.spec.whatwg.org/multipage/dom.html#global-attributes )',
		attrs: [
			'accesskey',
			'autocapitalize',
			'autofocus',
			'contenteditable',
			'dir',
			'draggable',
			'enterkeyhint',
			'hidden',
			'inert',
			'inputmode',
			'is',
			'itemid',
			'itemprop',
			'itemref',
			'itemscope',
			'itemtype',
			'lang',
			'nonce',
			'spellcheck',
			'style',
			'tabindex',
			'title',
			'translate',
			'class',
			'id',
			'slot',
			// "data-*" // No apply
			'xmlns',
			'xml:lang',
			'xml:space',
		],
	},
	'#GlobalEventAttrs': {
		description:
			'[GlobalEventHandlers]( https://html.spec.whatwg.org/multipage/webappapis.html#globaleventhandlers ) and [UIEvent]( https://w3c.github.io/uievents/#event-types-list )',
		attrs: [
			'onabort',
			'onauxclick',
			'onbeforeinput', // UI Events
			'onblur',
			'oncancel',
			'oncanplay',
			'oncanplaythrough',
			'onchange',
			'onclick',
			'onclose',
			'oncontextlost',
			'oncompositionstart', // UI Events
			'oncompositionupdate', // UI Events
			'oncompositionend', // UI Events
			'oncontextmenu',
			'oncontextrestored',
			'oncuechange',
			'ondblclick',
			'ondrag',
			'ondragend',
			'ondragenter',
			'ondragleave',
			'ondragover',
			'ondragstart',
			'ondrop',
			'ondurationchange',
			'onemptied',
			'onended',
			'onerror',
			'onfocus',
			'onformdata',
			'onfocusin', // UI Events
			'onfocusout', // UI Events
			'oninput',
			'oninvalid',
			'onkeydown',
			'onkeypress',
			'onkeyup',
			'onload',
			'onloadeddata',
			'onloadedmetadata',
			'onloadstart',
			'onmousedown',
			'onmouseenter',
			'onmouseleave',
			'onmousemove',
			'onmouseout',
			'onmouseover',
			'onmouseup',
			'onpause',
			'onplay',
			'onplaying',
			'onprogress',
			'onratechange',
			'onreset',
			'onresize',
			'onscroll',
			'onsecuritypolicyviolation',
			'onseeked',
			'onseeking',
			'onselect',
			'onslotchange',
			'onstalled',
			'onsubmit',
			'onsuspend',
			'ontimeupdate',
			'ontoggle',
			'onvolumechange',
			'onwaiting',
			'onwebkitanimationend',
			'onwebkitanimationiteration',
			'onwebkitanimationstart',
			'onwebkittransitionend',
			'onunload', // UI Events
			'onwheel',
		],
	},
	'#DocumentElementEventAttrs': {
		description:
			'[DocumentAndElementEventHandlers]( https://html.spec.whatwg.org/multipage/webappapis.html#documentandelementeventhandlers )',
		attrs: ['oncopy', 'oncut', 'onpaste'],
	},
	'#HTMLLinkAndFetchingAttrs': {
		description: 'Link and fetching',
		attrs: [
			'crossorigin',
			'download',
			'href',
			'hreflang',
			'integrity',
			'loading',
			'media',
			'ping',
			'referrerpolicy',
			'rel',
			'target',
			'type',
		],
	},
	'#HTMLEmbededAndMediaContentAttrs': {
		description: 'Embeded and media contents',
		attrs: ['autoplay', 'controls', 'height', 'loop', 'muted', 'preload', 'sizes', 'src', 'srcset', 'width'],
	},
	'#HTMLFormControlElementAttrs': {
		description: 'Form controls',
		attrs: [
			'autocomplete',
			'dirname',
			'disabled',
			'form',
			'formaction',
			'formenctype',
			'formmethod',
			'formnovalidate',
			'formtarget',
			'maxlength',
			'minlength',
			'name',
			'readonly',
			'required',
		],
	},
	'#HTMLTableCellElementAttrs': {
		description: 'Table cell',
		attrs: ['colspan', 'headers', 'rowspan'],
	},
	'#ARIAAttrs': {
		description:
			'[The ARIA role and aria-* attributes]( https://html.spec.whatwg.org/multipage/dom.html#global-attributes:attr-aria-role )',
		attrs: [
			'role',
			// "aria-*" // No apply
		],
	},
	'#SVGAnimationAdditionAttrs': {
		description:
			'[Attributes that control whether animations are additive]( https://svgwg.org/specs/animations/#AdditionAttributes )',
		attrs: ['additive', 'accumulate'],
	},
	'#SVGAnimationAttributeTargetAttrs': {
		description:
			'[The target attribute]( https://www.w3.org/TR/2001/REC-smil-animation-20010904/#SpecifyingTargetAttribute )',
		attrs: [
			'attributeName',
			'attributeType', // No supported on SVG
		],
	},
	'#SVGAnimationEventAttrs': {
		description: '[animation event attribute]( https://svgwg.org/specs/animations/#TermAnimationEventAttribute )',
		attrs: ['onbegin', 'onend', 'onrepeat'],
	},
	'#SVGAnimationTargetElementAttrs': {
		description:
			'[Attributes to identify the target element for an animation]( https://svgwg.org/specs/animations/#TargetElement )',
		attrs: [
			'href',
			'xlink:href', // Deprecated
		],
	},
	'#SVGAnimationTimingAttrs': {
		description:
			'[Attributes to control the timing of the animation]( https://svgwg.org/specs/animations/#TimingAttributes )',
		attrs: ['begin', 'dur', 'end', 'min', 'max', 'restart', 'repeatCount', 'repeatDur', 'fill'],
	},
	'#SVGAnimationValueAttrs': {
		description:
			'- [Attributes that define animation values over time]( https://svgwg.org/specs/animations/#ValueAttributes )\nAND\n- [SMIL 3.0 Time Manipulations]( https://www.w3.org/TR/REC-smil/smil-timemanip.html )',
		attrs: [
			// SVG2
			'calcMode',
			'values',
			'keyTimes',
			'keySplines',
			'from',
			'to',
			'by',
			// SMIL
			'accelerate',
			'decelerate',
			'autoReverse',
			'speed',
		],
	},
	'#SVGConditionalProcessingAttrs': {
		description:
			'[conditional processing attribute]( https://svgwg.org/svg2-draft/struct.html#TermConditionalProcessingAttribute )',
		attrs: [
			'requiredExtensions',
			'systemLanguage',
			'requiredFeatures', // Deprecated
		],
	},
	'#SVGCoreAttrs': {
		description: '[core attributes]( https://svgwg.org/svg2-draft/struct.html#TermCoreAttribute )',
		attrs: [
			'id',
			'tabindex',
			'autofocus',
			'lang',
			'xml:space',
			'class',
			'style',
			'xmlns',
			// "data-*" // No apply
			'xml:lang', // Obsoleted
			'xml:base', // Obsoleted
		],
	},
	'#SVGFilterPrimitiveAttrs': {
		description: '[Common filter primitive attributes]( https://drafts.fxtf.org/filter-effects/#CommonAttributes )',
		attrs: ['x', 'y', 'width', 'height', 'result', 'in'],
	},
	'#SVGPresentationAttrs': {
		description: '[Presentation attributes]( https://svgwg.org/svg2-draft/styling.html#PresentationAttributes )',
		attrs: [
			// 	‘circle’ and ‘ellipse’
			'cx',
			'cy',
			// ‘foreignObject’, ‘image’, ‘rect’, ‘svg’, ‘symbol’, and ‘use’
			'height',
			'width',
			'x',
			'y',
			// 	‘circle’
			'r',
			// ‘ellipse’ and ‘rect’
			'rx',
			'ry',
			// ‘path’
			'd',
			// Any element in the SVG namespace except for animation elements, which have a different ‘fill’ attribute.
			'fill',
			// Any element in the SVG namespace with the exception of the ‘pattern’, ‘linearGradient’ and ‘radialGradient’ elements.
			'transform',
			// ‘pattern’. ‘patternTransform’ gets mapped to the transform CSS property [css-transforms-1].
			'patternTransform',
			// ‘linearGradient’ and ‘radialGradient’ elements. ‘gradientTransform’ gets mapped to the transform CSS property [css-transforms-1].
			'gradientTransform',
			// Any element in the SVG namespace.
			'alignment-baseline',
			'baseline-shift',
			'clip-path',
			'clip-rule',
			'color',
			'color-interpolation',
			'color-interpolation-filters',
			'cursor',
			'direction',
			'display',
			'dominant-baseline',
			'fill-opacity',
			'fill-rule',
			'filter',
			'flood-color',
			'flood-opacity',
			'font', // Shorthand
			'font-family',
			'font-size',
			'font-size-adjust',
			'font-stretch',
			'font-style',
			'font-variant',
			'font-weight',
			'glyph-orientation-horizontal',
			'glyph-orientation-vertical',
			'image-rendering',
			'isolation',
			'letter-spacing',
			'lighting-color',
			'marker', // Shorthand
			'marker-end',
			'marker-mid',
			'marker-start',
			'mask',
			'mask-type',
			'opacity',
			'overflow',
			'paint-order',
			'pointer-events',
			'shape-rendering',
			'stop-color',
			'stop-opacity',
			'stroke',
			'stroke-dasharray',
			'stroke-dashoffset',
			'stroke-linecap',
			'stroke-linejoin',
			'stroke-miterlimit',
			'stroke-opacity',
			'stroke-width',
			'text-anchor',
			'text-decoration',
			'text-overflow',
			'text-rendering',
			'transform-origin',
			'unicode-bidi',
			'vector-effect',
			'visibility',
			'white-space',
			'word-spacing',
			'writing-mode',
			'clip', // Deprecated
			'color-profile', // Deprecated
			'color-rendering', // Deprecated
			'enable-background', // Deprecated
			'kerning', // Deprecated
		],
	},
	'#SVGTransferFunctionAttrs': {
		description:
			'[transfer function element attributes,]( https://drafts.fxtf.org/filter-effects/#transfer-function-element-attributes )',
		attrs: ['type', 'tableValues', 'slope', 'intercept', 'amplitude', 'exponent', 'offset'],
	},
	'#XLinkAttrs': {
		description:
			'[Deprecated XLink URL reference attributes]( https://svgwg.org/svg2-draft/linking.html#XLinkRefAttrs )',
		attrs: [
			// Deprecated
			'xlink:href',
			'xlink:title',
			// Obosoleted
			'xlink:actuate',
			'xlink:arcrole',
			'xlink:role',
			'xlink:show',
			'xlink:type',
		],
	},
};
