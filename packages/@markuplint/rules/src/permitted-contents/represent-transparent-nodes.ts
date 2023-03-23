import type { ChildNode, Options, Result, Specs } from './types';
import type { ReadonlyDeep } from 'type-fest';

import { getContentModel } from '@markuplint/ml-spec';

import { order } from './order';
import { Collection, getChildNodesWithoutWhitespaces, isTransparent, matches } from './utils';

export const transparentMode = new Map<ChildNode, true>();

export function representTransparentNodes(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	nodes: ChildNode[],
	specs: ReadonlyDeep<Specs>,
	options: Options,
): {
	nodes: ChildNode[];
	errors: Result[];
} {
	const result: ChildNode[] = [];
	const errors: Result[] = [];

	const parent = nodes[0]?.parentElement;

	if (parent) {
		const { errors: parentErrors } = representTransparentNodes([parent], specs, options);
		errors.push(...parentErrors);
	}

	for (const node of nodes) {
		if (!node.is(node.ELEMENT_NODE)) {
			result.push(node);
			continue;
		}

		const models = getContentModel(node, specs.specs);

		if (models == null || typeof models === 'boolean') {
			result.push(node);
			continue;
		}

		const noTransparentModels = models.filter(m => !isTransparent(m));

		if (noTransparentModels.length === models.length) {
			result.push(node);
			continue;
		}

		const collection = new Collection(getChildNodesWithoutWhitespaces(node));

		let unmatched: ChildNode[];

		if (noTransparentModels.length) {
			const result = order(noTransparentModels, collection.unmatched, specs, options, Infinity);
			unmatched = result.unmatched;
		} else {
			unmatched = collection.unmatched;
		}

		const transparent = models.find(m => isTransparent(m));

		if (!transparent || !isTransparent(transparent)) {
			throw new Error('Unreachable code');
		}

		for (const _child of unmatched) {
			const child: ChildNode = _child;

			if (transparentMode.has(child)) {
				continue;
			}

			transparentMode.set(child, true);

			if (child.is(child.ELEMENT_NODE)) {
				const transparentCondMatched = matches(transparent.transparent, child, specs);

				if (!transparentCondMatched.matched) {
					errors.push({
						type: 'TRANSPARENT_MODEL_DISALLOWS',
						matched: [],
						unmatched: [node],
						zeroMatch: false,
						query: transparent.transparent,
						hint: {
							not: transparentCondMatched.not,
							transparent: node,
						},
					});
					continue;
				}
			}

			result.push(child);
		}
	}

	return {
		nodes: result,
		errors,
	};
}
