import type { ContentModelResult, Element, Options, Specs } from './types';
import type { ContentModel } from '@markuplint/ml-spec';
import type { ReadonlyDeep } from 'type-fest';

import { order } from './order';
import { representTransparentNodes } from './represent-transparent-nodes';
import { getChildNodesWithoutWhitespaces } from './utils';

/**
 * Check start
 *
 * @param contents
 * @param el
 * @param specs
 * @param options
 * @returns
 */
export function start(
	contents: ReadonlyDeep<ContentModel['contents']>,
	el: Element,
	specs: ReadonlyDeep<Specs>,
	options: Options,
): ContentModelResult[] {
	if (contents === false) {
		if (el.childNodes.length) {
			return [
				{
					type: 'NOTHING',
					scope: el,
					query: ':not(*)',
					hint: {},
				},
			];
		}
		return [
			{
				type: 'MATCHED',
				scope: el,
				query: '*',
				hint: {},
			},
		];
	}
	if (contents === true) {
		// Allows all elements
		return [
			{
				type: 'MATCHED',
				scope: el,
				query: '*',
				hint: {},
			},
		];
	}

	const { nodes, errors } = representTransparentNodes(getChildNodesWithoutWhitespaces(el), specs, options);

	const result = order(contents, nodes, specs, options, 0);

	return [
		{
			type: result.type,
			scope:
				result.type === 'MISSING_NODE_REQUIRED' || result.type === 'MISSING_NODE_ONE_OR_MORE'
					? el
					: result.unmatched[0] ?? el,
			query: result.query,
			hint: result.hint,
		},
		...errors.map(error => ({
			type: error.type,
			scope: error.unmatched[0] ?? el,
			query: error.query,
			hint: error.hint,
		})),
	];
}
