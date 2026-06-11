/**
 * @experimental
 * Scope computation for bulk suppressions (Phase 2).
 * Computes the Lowest Common Ancestor (LCA) of violation nodes and generates
 * a minimal CSS selector to identify the subtree containing all violations.
 *
 * Selector precision is deliberately preferred over refactoring stability:
 * id/class/attribute selectors may stop matching after a DOM refactoring,
 * but a broken scope fails safe — it matches zero nodes, the scoped count
 * (0) stays within the suppressed count, and the entry merely lingers as
 * "unused" until `--prune-suppressions` cleans it up. New violations are
 * never hidden. Loose tag-only selectors (e.g. `div > div > div`) were
 * rejected because an unrelated matching subtree elsewhere in the file
 * could absorb new violations into the suppressed count and hide
 * regressions — the genuinely dangerous failure mode.
 *
 * Caveat for template languages (Vue, Svelte, etc.): the generated selector
 * reflects the parsed DOM structure, which may differ from the authored
 * source template.
 *
 * @see https://github.com/markuplint/markuplint/issues/3509
 */

import type { Violation } from '@markuplint/ml-config';

/**
 * @experimental
 * Minimal node interface for scope computation.
 * Defined as a standalone interface (rather than importing `SelectorElement`
 * from `@markuplint/selector`) to avoid coupling the `markuplint` package
 * to the selector package's internal types. Both `SelectorElement` and
 * `MLElement` satisfy this interface via structural typing.
 */
export interface ScopedNode {
	readonly nodeType: number;
	readonly localName: string;
	readonly id: string;
	readonly classList: Iterable<string> & { contains(className: string): boolean };
	readonly attributes: Iterable<{ readonly name: string; readonly value: string }>;
	readonly parentElement: ScopedNode | null;
	readonly children: Iterable<ScopedNode>;
}

/**
 * @experimental
 * Node with position information for reverse-lookup from violations.
 */
export interface PositionedNode extends ScopedNode {
	readonly startLine: number;
	readonly startCol: number;
}

const BODY_HTML_TAGS = new Set(['body', 'html']);

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
export function getAncestorChain(node: ScopedNode): ScopedNode[] {
	const chain: ScopedNode[] = [];
	let current = node.parentElement;
	while (current) {
		chain.push(current);
		current = current.parentElement;
	}
	return chain;
}

/**
 * @experimental
 * Computes the Lowest Common Ancestor (LCA) of a set of nodes.
 * Returns null if the LCA is `body`, `html`, or the input is empty.
 *
 * @param nodes - The nodes to find the LCA for.
 * @returns The LCA node, or null if it falls back to file-level.
 */
// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
export function computeLCA(nodes: readonly ScopedNode[]): ScopedNode | null {
	if (nodes.length === 0) {
		return null;
	}

	if (nodes.length === 1) {
		const parent = nodes[0]!.parentElement;
		if (!parent || BODY_HTML_TAGS.has(parent.localName)) {
			return null;
		}
		return parent;
	}

	// Get ancestor chains for all nodes (including the node itself)
	const chains = nodes.map(node => {
		const chain = [node, ...getAncestorChain(node)];
		// Reverse so root is first
		chain.reverse();
		return chain;
	});

	// Walk from root, find deepest common ancestor
	const minLength = Math.min(...chains.map(c => c.length));
	let lca: ScopedNode | null = null;

	for (let i = 0; i < minLength; i++) {
		const candidate = chains[0]![i]!;
		if (chains.every(chain => chain[i] === candidate)) {
			lca = candidate;
		} else {
			break;
		}
	}

	if (!lca || BODY_HTML_TAGS.has(lca.localName)) {
		return null;
	}

	return lca;
}

/**
 * @experimental
 * Generates a minimal CSS selector that uniquely identifies the given node.
 *
 * Strategy:
 * 1. If the node has an `id`, use `#id` (most unique)
 * 2. If the node has classes, use `tag.class`
 * 3. Otherwise, build an ancestor path using `>` combinators, stopping at
 *    the first ancestor with an `id`
 *
 * Returns `undefined` for `body` or `html` nodes (file-level fallback).
 *
 * @param node - The node to generate a selector for.
 * @returns A CSS selector string, or undefined for file-level scope.
 */
// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
export function generateUniqueSelector(node: ScopedNode): string | undefined {
	if (BODY_HTML_TAGS.has(node.localName)) {
		return undefined;
	}

	// If this node has an id, just use it
	if (node.id) {
		return `#${node.id}`;
	}

	// If this node has classes, use tag.classA.classB (all classes)
	const classes = [...node.classList];
	if (classes.length > 0) {
		return `${node.localName}.${classes.join('.')}`;
	}

	// If this node has a distinguishing attribute (role, or type for input),
	// use tag[attr="value"] — more readable than nth-of-type and more stable
	const attrSelector = getDistinguishingAttrSelector(node);
	if (attrSelector) {
		return attrSelector;
	}

	// Build ancestor path with nth-of-type for disambiguation, stopping at
	// an id, class, or distinguishing attribute
	const parts: string[] = [buildSegmentWithNth(node)];
	let current = node.parentElement;
	while (current && !BODY_HTML_TAGS.has(current.localName)) {
		if (current.id) {
			parts.unshift(`#${current.id}`);
			break;
		}
		const currentClasses = [...current.classList];
		if (currentClasses.length > 0) {
			parts.unshift(`${current.localName}.${currentClasses.join('.')}`);
			break;
		}
		const currentAttr = getDistinguishingAttrSelector(current);
		if (currentAttr) {
			parts.unshift(currentAttr);
			break;
		}
		parts.unshift(buildSegmentWithNth(current));
		current = current.parentElement;
	}

	return parts.join(' > ');
}

/**
 * Attributes that serve as distinguishing selectors.
 * - `role`: Universally applicable — identifies landmark/widget semantics
 * - `type`: Only for `<input>` — distinguishes text/checkbox/radio/etc.
 */
const DISTINGUISHING_ATTRS: ReadonlyMap<string | null, readonly string[]> = new Map([
	[null, ['role']], // applicable to any element
	['input', ['type']], // only for <input>
]);

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
function getDistinguishingAttrSelector(node: ScopedNode): string | undefined {
	const universalAttrs = DISTINGUISHING_ATTRS.get(null) ?? [];
	const elementAttrs = DISTINGUISHING_ATTRS.get(node.localName) ?? [];
	const attrsToCheck = [...universalAttrs, ...elementAttrs];

	for (const attrName of attrsToCheck) {
		for (const attr of node.attributes) {
			if (attr.name === attrName && attr.value) {
				return `${node.localName}[${attrName}="${attr.value}"]`;
			}
		}
	}

	return undefined;
}

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
function buildSegmentWithNth(node: ScopedNode): string {
	const parent = node.parentElement;
	if (!parent) {
		return node.localName;
	}

	// Count same-tag siblings and find this node's position
	let sameTagCount = 0;
	let position = 0;
	for (const sibling of parent.children) {
		if (sibling.localName === node.localName) {
			sameTagCount++;
			if (sibling === node) {
				position = sameTagCount;
			}
		}
	}

	if (sameTagCount > 1) {
		return `${node.localName}:nth-of-type(${position})`;
	}

	return node.localName;
}

/**
 * @experimental
 * The O(n) linear search per violation is deliberate — acceptable for
 * typical document sizes; build a position index only if very large
 * documents make this a measured bottleneck.
 */
export function findNodeAtPosition(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	nodeList: readonly PositionedNode[],
	line: number,
	col: number,
): ScopedNode | null {
	for (const node of nodeList) {
		if (node.startLine === line && node.startCol === col) {
			if (node.nodeType === 1) {
				return node;
			}
			// Non-element (e.g., attribute) — walk up to parent element
			let parent = node.parentElement;
			while (parent && parent.nodeType !== 1) {
				parent = parent.parentElement;
			}
			return parent;
		}
	}
	return null;
}

/**
 * @experimental
 * Computes the scope selector for a set of violations within a document.
 * Only considers error-severity violations. Returns `undefined` when
 * the LCA falls back to file-level (body/html) or when nodes cannot be found.
 *
 * @param nodeList - Flat list of all nodes in the document.
 * @param violations - The violations to compute scope for.
 * @returns A CSS selector string, or undefined for file-level scope.
 */
export function computeScopeForViolations(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	nodeList: readonly PositionedNode[],

	violations: readonly Violation[],
): string | undefined {
	const nodes: ScopedNode[] = [];

	for (const v of violations) {
		if (v.severity !== 'error') {
			continue;
		}
		const node = findNodeAtPosition(nodeList, v.line, v.col);
		if (node) {
			nodes.push(node);
		}
	}

	if (nodes.length === 0) {
		return undefined;
	}

	const lca = computeLCA(nodes);
	if (!lca) {
		return undefined;
	}

	return generateUniqueSelector(lca);
}
