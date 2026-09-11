import type { ChildNode, Mode, Options, Result, Specs, TagRule } from './types.js';

import { resolveContentModel } from './content-model.js';
import { cmLog } from './debug.js';
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
 * Maximum number of patterns to generate before falling back to a
 * conservative all-children-merged approach. Prevents exponential
 * blowup when many conditional transparent elements are siblings.
 *
 * ### Rationale
 *
 * When N transparent elements each have K conditional branches (e.g.,
 * `v-if`/`v-else`), the exact cross-product yields K^N patterns.
 * With K=2 and N=10, this is 2^10 = 1024 — still manageable.
 * At N=11 (2^11 = 2048) the cap triggers, switching to a
 * conservative fallback that merges all branch children into every
 * pattern. This keeps runtime linear while covering most real-world
 * conditional structures.
 *
 * ### Fallback precision
 *
 * When the cap is exceeded, the fallback produces an
 * **over-approximation**: all children from all branches are included
 * in every pattern. This may cause false negatives (valid violations
 * go undetected because the merged pattern appears to satisfy the
 * content model) but will never cause false positives (spurious
 * violations are not introduced). In practice, HTML documents rarely
 * exceed 10 conditional transparent siblings, so the cap is
 * transparent to most users.
 *
 * @see https://github.com/markuplint/markuplint/issues/3249
 */
const MAX_PATTERNS = 1024;

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
 * 6. Builds patterns incrementally, capping cross-products to avoid exponential blowup.
 *
 * ### Algorithm — incremental pattern building
 *
 * Patterns are built incrementally as each child node is visited:
 *
 * - **Non-transparent child**: appended to every existing pattern.
 *   Pattern count stays the same.
 * - **Single-branch transparent child** (non-conditional, or
 *   `evaluateConditionalChildNodes` disabled): all unmatched children
 *   are spread into every pattern. Pattern count stays the same.
 * - **Multi-branch transparent child** (conditional, e.g. `v-if`/`v-else`):
 *   a cross-product of existing patterns × branch groups is computed,
 *   capped at {@link MAX_PATTERNS}. If the cap would be exceeded, a
 *   conservative fallback merges all branch children into every pattern.
 *
 * ### Complexity
 *
 * - **Previous algorithm** (`branchesToPatterns` Cartesian product):
 *   O(K^N) time and space, where N = number of transparent elements,
 *   K = average branch count per element. 12 elements with 2 children
 *   each produced 4096 patterns and took 30+ seconds.
 * - **Current algorithm**: O(N × K × min(|patterns|, MAX_PATTERNS))
 *   time; O(MAX_PATTERNS × P) space where P = average pattern length.
 *   The same 12-element case now produces 1 pattern in <100 ms.
 *
 * @param childNodes - The child nodes of the element being validated, some of which may be transparent.
 * @param specs - The resolved spec data for content model lookups.
 * @param options - Validation behavior options.
 * @returns An array of possible transparent node resolutions, each with flattened nodes and accumulated errors.
 * @see https://github.com/markuplint/markuplint/issues/3249
 */
export function representTransparentNodes(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	childNodes: readonly ChildNode[],
	rules: readonly TagRule[],
	specs: Specs,
	options: Options,
	mode: Mode,
): TransparentNode[] {
	const parentElement = childNodes[0]?.parentElement;
	const parentResults = parentElement
		? representTransparentNodes([parentElement], rules, specs, options, mode)
		: [{ nodes: [], errors: [] }];

	let patterns: (ChildNode | Result)[][] = [[]];

	for (const childNode of childNodes) {
		if (!childNode.is(childNode.ELEMENT_NODE)) {
			for (const p of patterns) {
				p.push(childNode);
			}
			continue;
		}

		const models = resolveContentModel(childNode, rules, specs, mode);

		if (models == null || typeof models === 'boolean') {
			for (const p of patterns) {
				p.push(childNode);
			}
			continue;
		}

		const noTransparentModels = models.filter(m => !isTransparent(m));

		if (noTransparentModels.length === models.length) {
			for (const p of patterns) {
				p.push(childNode);
			}
			continue;
		}

		const childNodesPatterns = options.evaluateConditionalChildNodes
			? childNode.conditionalChildNodes().map(childNodes => [...childNodes])
			: [[...childNode.childNodes].filter(child => !(child.is(child.TEXT_NODE) && child.isWhitespace()))];

		const branchGroups: (ChildNode | Result)[][] = [];

		for (const branchChildNodes of childNodesPatterns) {
			const collection = new Collection([...branchChildNodes]);

			let unmatched: ChildNode[];

			if (noTransparentModels.length > 0) {
				const result = order(
					noTransparentModels,
					collection.unmatched,
					rules,
					specs,
					options,
					Number.POSITIVE_INFINITY,
					mode,
				);
				unmatched = result.unmatched;
			} else {
				unmatched = collection.unmatched;
			}

			const transparent = models.find(m => isTransparent(m));

			if (!transparent || !isTransparent(transparent)) {
				throw new Error('Unreachable code');
			}

			const branchChildren: (ChildNode | Result)[] = [];

			for (const _child of unmatched) {
				const child: ChildNode = _child;

				if (transparentMode.has(child)) {
					continue;
				}

				transparentMode.set(child, true);

				if (child.is(child.ELEMENT_NODE)) {
					const transparentCondMatched = matches(transparent.transparent, child, specs, mode);

					if (!transparentCondMatched.matched) {
						branchChildren.push({
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

				branchChildren.push(child);
			}

			branchGroups.push(branchChildren);
		}

		// The transparent element itself is still a child of the current parent
		// and must be evaluated against the parent's own content model (e.g., a
		// `<button>` must reject an `<a href>` descendant even though `<a>`'s
		// children are also transparently checked). It is pushed exactly once
		// per resulting pattern below — never once per branch group — so
		// conditional (`v-if`/`v-else`) branches don't multiply it.
		// See https://github.com/markuplint/markuplint/issues/3928
		if (branchGroups.length === 1) {
			const singleGroup = branchGroups[0]!;
			for (const p of patterns) {
				p.push(childNode, ...singleGroup);
			}
		} else if (patterns.length * branchGroups.length <= MAX_PATTERNS) {
			const newPatterns: (ChildNode | Result)[][] = [];
			for (const p of patterns) {
				for (const group of branchGroups) {
					newPatterns.push([...p, childNode, ...group]);
				}
			}
			patterns = newPatterns;
		} else {
			// Cap exceeded (#3895): fall back to the conservative
			// over-approximation documented on MAX_PATTERNS. False negatives
			// are possible beyond this point, so leave a debug trace.
			cmLog(
				'Transparent pattern cap exceeded on <%s> (%d patterns x %d branches > %d): merging all branch children into every pattern; false negatives are possible',
				childNode.nodeName,
				patterns.length,
				branchGroups.length,
				MAX_PATTERNS,
			);
			const allChildren = branchGroups.flat();
			for (const p of patterns) {
				p.push(childNode, ...allChildren);
			}
		}
	}

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
