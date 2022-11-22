import type { MLMLSpec } from '../types';

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

export function isPalpableElement(
	el: Element,
	specs: Readonly<MLMLSpec>,
	options?: {
		extendsSvg?: boolean;
		extendsExposableElements?: boolean;
	},
) {
	const conditions = [specs.def['#contentModels']['#palpable']?.join(',') || ''];

	if (options?.extendsSvg !== false /* default true */) {
		conditions.push(specs.def['#contentModels']['#SVGRenderable']?.join(',') || '');
	}

	if (options?.extendsExposableElements /* default false */) {
		conditions.push(exposableElementsThatAreNoBelongingAModel.join(','));
	}

	return conditions.some(condition => {
		return el.matches(condition);
	});
}
