import type { MLMLSpec } from '../../types/index.js';

/**
 * Exposable content models and elements
 *
 * **WARNING**:
 * This implementation is through the author's interpretation.
 * Want a issue request.
 * https://github.com/markuplint/markuplint/issues/new
 *
 * @see https://html.spec.whatwg.org/multipage/indices.html#elements-3
 */
const exposableElementsThatAreNoBelongingAModel: string[] = [
	'body',
	'dd',
	'dt',
	'figcaption',
	'html',
	'legend',
	'li',
	'optgroup',
	'option',
	'rp',
	'rt',
	'summary',
	'tbody',
	'td',
	'tfoot',
	'th',
	'thead',
	'tr',
];

/**
 * Determines whether an element is considered palpable content. Palpable elements
 * are those that render something visible or meaningful to the user. Optionally
 * extends the check to include SVG renderable elements and other exposable elements
 * that do not belong to any standard content model category.
 *
 * @param el - The DOM element to check
 * @param specs - The full markup language specification
 * @param options - Optional flags to extend the palpable check
 * @param options.extendsSvg - Whether to include SVG renderable elements (defaults to true)
 * @param options.extendsExposableElements - Whether to include additional exposable elements like `<li>`, `<td>`, etc. (defaults to false)
 * @returns `true` if the element is considered palpable content
 */
export function isPalpableElement(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	specs: MLMLSpec,
	options?: {
		readonly extendsSvg?: boolean;
		readonly extendsExposableElements?: boolean;
	},
) {
	const conditions = [specs.def['#contentModels']['#palpable']?.join(',') ?? ''];

	if (options?.extendsSvg !== false /* default true */) {
		conditions.push(specs.def['#contentModels']['#SVGRenderable']?.join(',') ?? '');
	}

	if (options?.extendsExposableElements /* default false */) {
		conditions.push(exposableElementsThatAreNoBelongingAModel.join(','));
	}

	return conditions.some(condition => {
		return el.matches(condition);
	});
}
