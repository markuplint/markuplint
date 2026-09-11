import type { Violation } from '@markuplint/ml-config';

import type { PositionedNode, ScopedNode } from './compute-scope.js';
import type { SuppressionEntry, SuppressionsData } from './types.js';

import { findNodeAtPosition } from './compute-scope.js';
import { toRelativePath } from './suppressions-file.js';

/**
 * @experimental
 * Result of applying suppressions to violations.
 */
export type ApplySuppressionsResult = {
	/** Violations after filtering out suppressed ones. */
	readonly filtered: Map<string, Violation[]>;
	/** List of unused suppression entries (as "filePath:ruleId" strings). */
	readonly unusedEntries: readonly string[];
};

/**
 * @experimental
 * Options for applying suppressions.
 */
export type ApplySuppressionsOptions = {
	/**
	 * Map of absolute file paths to their document node lists.
	 * When provided, scope-aware filtering is used.
	 * When absent, scope is ignored (Phase 1 compatible).
	 */

	readonly nodeLists?: ReadonlyMap<string, readonly PositionedNode[]>;
};

function isViolationInScope(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	nodeList: readonly PositionedNode[],

	violation: Violation,
	scope: string,
): boolean {
	const violationNode = findNodeAtPosition(nodeList, violation.line, violation.col);
	if (!violationNode) {
		return false;
	}

	// Check the node itself and walk up ancestors
	if (matchesScopeSelector(violationNode, scope)) {
		return true;
	}
	let current = violationNode.parentElement;
	while (current) {
		if (matchesScopeSelector(current, scope)) {
			return true;
		}
		current = current.parentElement;
	}

	return false;
}

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
function matchesScopeSelector(node: ScopedNode, scope: string): boolean {
	const segments = scope.split(' > ');
	let current: ScopedNode | null = node;

	// Match segments from right (most specific) to left (ancestors)
	for (let i = segments.length - 1; i >= 0; i--) {
		if (!current) {
			return false;
		}
		if (!matchesSegment(current, segments[i]!)) {
			return false;
		}
		current = current.parentElement;
	}

	return true;
}

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
function matchesSegment(node: ScopedNode, segment: string): boolean {
	if (segment.length === 0) {
		return false;
	}

	// #id
	if (segment.startsWith('#')) {
		const id = segment.slice(1);
		return id.length > 0 && node.id === id;
	}

	// tag[attr="value"]
	const attrMatch = /^([a-z-]+)\[([a-z-]+)="([^"]+)"\]$/.exec(segment);
	if (attrMatch) {
		const [, tag, attrName, attrValue] = attrMatch;
		if (node.localName !== tag) {
			return false;
		}
		for (const attr of node.attributes) {
			if (attr.name === attrName && attr.value === attrValue) {
				return true;
			}
		}
		return false;
	}

	// Extract :nth-of-type(n) if present
	const nthMatch = /:nth-of-type\((\d+)\)$/.exec(segment);
	const baseSegment = nthMatch ? segment.slice(0, nthMatch.index) : segment;

	// tag.classA.classB
	const dotIndex = baseSegment.indexOf('.');
	let tagMatches: boolean;
	if (dotIndex === -1) {
		// tag only
		tagMatches = node.localName === baseSegment;
	} else {
		const tag = baseSegment.slice(0, dotIndex);
		const classes = baseSegment.slice(dotIndex + 1).split('.');
		tagMatches = node.localName === tag && classes.every(cls => node.classList.contains(cls));
	}

	if (!tagMatches) {
		return false;
	}

	// Check nth-of-type position
	if (nthMatch) {
		const expectedPosition = Number.parseInt(nthMatch[1]!, 10);
		const parent = node.parentElement;
		if (!parent) {
			return false;
		}
		let position = 0;
		for (const sibling of parent.children) {
			if (sibling.localName === node.localName) {
				position++;
				if (sibling === node) {
					return position === expectedPosition;
				}
			}
		}
		return false;
	}

	return true;
}

/**
 * @experimental
 * Applies suppressions to collected violations.
 *
 * For each file+ruleId pair:
 * - If the entry has a `scope`, only violations within that scope subtree are
 *   counted AND filtered. Violations outside the scope are always passed through.
 * - If current scoped error count <= suppressed count: scoped error violations are removed.
 * - If current scoped error count > suppressed count: ALL scoped violations are kept.
 *
 * Warning and info violations always pass through unmodified.
 * When `options.nodeLists` is not provided, scope is ignored (Phase 1 compatible).
 *
 * Rationale:
 * - Matching is count-based per (file, rule) rather than per individual
 *   violation because line numbers shift on every edit and message hashes
 *   are fragile; count matching survives formatting, reordering, and minor
 *   refactoring (same trade-off as ESLint's bulk suppressions).
 * - When the count is exceeded, ALL violations are reported — not just the
 *   delta — because the user needs the full picture to investigate the
 *   regression; an isolated "2 new violations" lacks context.
 *
 * @param violationsByFile - Map of absolute file paths to violations.
 * @param suppressions - The loaded suppressions data.
 * @param suppressionsFilePath - Absolute path to the suppressions file.
 * @param options - Optional options including document node lists for scope-aware filtering.
 * @returns Filtered violations and a list of unused suppression entries.
 */

export function applySuppressions(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	violationsByFile: ReadonlyMap<string, readonly Violation[]>,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	suppressions: SuppressionsData,
	suppressionsFilePath: string,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	options?: ApplySuppressionsOptions,
): ApplySuppressionsResult {
	const filtered = new Map<string, Violation[]>();
	const usedEntries = new Set<string>();
	const nodeLists = options?.nodeLists;

	for (const [absolutePath, violations] of violationsByFile) {
		const relPath = toRelativePath(absolutePath, suppressionsFilePath);
		const fileSuppressions = suppressions[relPath];

		if (!fileSuppressions) {
			filtered.set(absolutePath, [...violations]);
			continue;
		}

		const nodeList = nodeLists?.get(absolutePath);

		// Build a set of suppressed rules and their scoped violation indices.
		// For scope-aware entries, we track WHICH specific violations are in scope
		// so we can suppress only those, not all violations of the same ruleId.
		const suppressedViolationIndices = new Set<number>();

		for (const [ruleId, entry] of Object.entries(fileSuppressions)) {
			const { count: scopedCount, indices } = getScopedErrorInfo(violations, ruleId, entry, nodeList);

			if (scopedCount > 0 && scopedCount <= entry.count) {
				// Scoped count within threshold — suppress these specific violations
				for (const idx of indices) {
					suppressedViolationIndices.add(idx);
				}
			}

			if (scopedCount > 0) {
				usedEntries.add(`${relPath}:${ruleId}`);
			}
		}

		// Filter violations — only remove specifically identified violations
		const fileFiltered: Violation[] = [];
		for (const [i, violation] of violations.entries()) {
			if (suppressedViolationIndices.has(i)) {
				continue;
			}
			fileFiltered.push(violation);
		}

		filtered.set(absolutePath, fileFiltered);
	}

	// Find unused entries
	const unusedEntries: string[] = [];
	for (const [relPath, rules] of Object.entries(suppressions)) {
		for (const ruleId of Object.keys(rules)) {
			const key = `${relPath}:${ruleId}`;
			if (!usedEntries.has(key)) {
				unusedEntries.push(key);
			}
		}
	}

	return { filtered, unusedEntries };
}

function getScopedErrorInfo(
	violations: readonly Violation[],
	ruleId: string,

	entry: SuppressionEntry,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	nodeList: readonly PositionedNode[] | undefined,
): { count: number; indices: number[] } {
	let count = 0;
	const indices: number[] = [];

	for (const [i, violation] of violations.entries()) {
		const v = violation;
		if (v.severity !== 'error' || v.ruleId !== ruleId) {
			continue;
		}
		if (entry.scope && nodeList) {
			if (isViolationInScope(nodeList, v, entry.scope)) {
				count++;
				indices.push(i);
			}
		} else {
			count++;
			indices.push(i);
		}
	}

	return { count, indices };
}
