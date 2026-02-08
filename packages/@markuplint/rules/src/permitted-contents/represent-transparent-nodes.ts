import type { ChildNode, Options, Result, Specs } from './types.js';

import { getContentModel } from '@markuplint/ml-spec';
import { branchesToPatterns } from '@markuplint/shared';

import { order } from './order.js';
import { Collection, isTransparent, matches } from './utils.js';

/**
 * A map tracking child nodes that are currently being evaluated through
 * a transparent content model. Used to prevent infinite recursion and
 * to enable special handling in error messages and debug output.
 */
export const transparentMode = new Map<ChildNode, true>();

/**
 * Represents a possible resolution of transparent content model nodes,
 * containing the flattened list of child nodes to validate and any
 * errors detected during transparent model resolution.
 */
type TransparentNode = {
	nodes: ChildNode[];
	errors: Result[];
};

/**
 * Resolves transparent content model elements by replacing them with their
 * children for validation purposes. In HTML, elements like `<a>`, `<ins>`, and `<del>`
 * have transparent content models, meaning their children must be valid in the
 * parent's content model as if the transparent element were not present.
 *
 * This function:
 * 1. Identifies child elements with transparent content models.
 * 2. Filters out children that match non-transparent parts of the element's content model.
 * 3. Replaces the transparent element with its remaining (unmatched) children.
 * 4. Validates that each remaining child satisfies the transparent model's condition selector.
 * 5. Recursively resolves parent-level transparent nodes to propagate errors up the tree.
 * 6. Uses `branchesToPatterns` to handle branching when multiple resolutions are possible.
 *
 * @param childNodes - The child nodes of the element being validated, some of which may be transparent.
 * @param specs - The resolved spec data for content model lookups.
 * @param options - Validation behavior options.
 * @returns An array of possible transparent node resolutions, each with flattened nodes and accumulated errors.
 */
export function representTransparentNodes(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	childNodes: readonly ChildNode[],
	specs: Specs,
	options: Options,
): TransparentNode[] {
	const parentElement = childNodes[0]?.parentElement;
	const parentResults = parentElement
		? representTransparentNodes([parentElement], specs, options)
		: [{ nodes: [], errors: [] }];

	const branches: (ChildNode | (ChildNode | Result)[])[] = [];

	for (const childNode of childNodes) {
		if (!childNode.is(childNode.ELEMENT_NODE)) {
			branches.push(childNode);
			continue;
		}

		const models = getContentModel(childNode, specs.specs);

		if (models == null || typeof models === 'boolean') {
			branches.push(childNode);
			continue;
		}

		const noTransparentModels = models.filter(m => !isTransparent(m));

		if (noTransparentModels.length === models.length) {
			branches.push(childNode);
			continue;
		}

		const childNodesPatterns = options.evaluateConditionalChildNodes
			? childNode.conditionalChildNodes().map(childNodes => [...childNodes])
			: [[...childNode.childNodes].filter(child => !(child.is(child.TEXT_NODE) && child.isWhitespace()))];

		const representPattern: (ChildNode | Result)[] = [];

		for (const childNodes of childNodesPatterns) {
			const collection = new Collection([...childNodes]);

			let unmatched: ChildNode[];

			if (noTransparentModels.length > 0) {
				const result = order(
					noTransparentModels,
					collection.unmatched,
					specs,
					options,
					Number.POSITIVE_INFINITY,
				);
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
						representPattern.push({
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

				representPattern.push(child);
			}
		}

		branches.push(representPattern);
	}

	const patterns = branchesToPatterns<ChildNode | Result>(branches);

	const result = parentResults.flatMap<TransparentNode>(parentResult => {
		const patternResults = patterns.map<TransparentNode>(pattern => {
			const nodes = pattern.filter((node): node is ChildNode => 'nodeName' in node);
			const errors = pattern.filter((node): node is Result => 'type' in node);
			return {
				nodes,
				errors: [...parentResult.errors, ...errors],
			};
		});
		if (patternResults.length === 0) {
			return {
				nodes: [],
				errors: parentResult.errors,
			};
		}
		return patternResults;
	});

	return result;
}
