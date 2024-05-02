import type { ChildNode, Options, Result, Specs } from './types.js';

import { getContentModel } from '@markuplint/ml-spec';

import { order } from './order.js';
import { Collection, getChildNodesWithoutWhitespaces, isTransparent, matches } from './utils.js';

export const transparentMode = new Map<ChildNode, true>();

export function representTransparentNodes(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	childNodes: readonly ChildNode[],
	specs: Specs,
	options: Options,
): {
	nodes: ChildNode[];
	errors: Result[];
} {
	const result: ChildNode[] = [];
	const errors: Result[] = [];

	const parent = childNodes[0]?.parentElement;

	if (parent) {
		const { errors: parentErrors } = representTransparentNodes([parent], specs, options);
		errors.push(...parentErrors);
	}

	for (const childNode of childNodes) {
		if (!childNode.is(childNode.ELEMENT_NODE)) {
			result.push(childNode);
			continue;
		}

		const models = getContentModel(childNode, specs.specs);

		if (models == null || typeof models === 'boolean') {
			result.push(childNode);
			continue;
		}

		const noTransparentModels = models.filter(m => !isTransparent(m));

		if (noTransparentModels.length === models.length) {
			result.push(childNode);
			continue;
		}

		const collection = new Collection(getChildNodesWithoutWhitespaces(childNode));

		let unmatched: ChildNode[];

		if (noTransparentModels.length > 0) {
			const result = order(noTransparentModels, collection.unmatched, specs, options, Number.POSITIVE_INFINITY);
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
						unmatched: [childNode],
						zeroMatch: false,
						query: transparent.transparent,
						hint: {
							not: transparentCondMatched.not,
							transparent: childNode,
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
