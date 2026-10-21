import type { Violation } from '@markuplint/ml-config';

import type { PositionedNode, ScopedNode } from './compute-scope.js';
import type { SuppressionEntry, SuppressionsData } from './types.js';

import {
	findNodeAtPosition,
	splitScopeAttr,
	splitScopeIdents,
	splitScopeNth,
	unescapeIdentifier,
} from './compute-scope.js';
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
	segments: readonly ScopeSegment[],
): boolean {
	const violationNode = findNodeAtPosition(nodeList, violation.line, violation.col);
	if (!violationNode) {
		return false;
	}

	// Check the node itself and walk up ancestors
	if (matchesScopeSelector(violationNode, segments)) {
		return true;
	}
	let current = violationNode.parentElement;
	while (current) {
		if (matchesScopeSelector(current, segments)) {
			return true;
		}
		current = current.parentElement;
	}

	return false;
}

/**
 * A segment of a scope as it is read.
 *
 * - `id`: `#id`
 * - `attr`: `tag[attr="value"]`
 * - `compound`: `tag.classA.classB` with an optional `:nth-of-type(n)`
 * - `null`: an empty segment, which matches no node
 */
type ScopeSegment =
	| { readonly kind: 'id'; readonly id: string }
	| { readonly kind: 'attr'; readonly tag: string; readonly attrName: string; readonly attrValue: string }
	| {
			readonly kind: 'compound';
			readonly tag: string;
			readonly classes: readonly string[];
			readonly nth: number | null;
	  }
	| null;

function parseSegment(segment: string): ScopeSegment {
	if (segment.length === 0) {
		return null;
	}

	// #id
	if (segment.startsWith('#')) {
		return { kind: 'id', id: unescapeIdentifier(segment.slice(1)) };
	}

	// tag[attr="value"]: the tag is the `localName` with a capital letter (`FooBar`), a digit (`h1`) or an escaped character
	// A segment with no `[` has no attribute, so it is not scanned for one
	const attr = segment.includes('[') ? splitScopeAttr(segment) : null;
	if (attr) {
		return {
			kind: 'attr',
			tag: splitScopeIdents(attr.tag).join('.'),
			attrName: attr.attrName,
			attrValue: attr.attrValue,
		};
	}

	// Extract :nth-of-type(n) if present and unescaped
	const { base: baseSegment, nth } = segment.includes(':') ? splitScopeNth(segment) : { base: segment, nth: null };

	// tag.classA.classB
	// A `.` of a name is escaped (`Tabs\.Root`), so only an unescaped one starts a class.
	const [tag, ...classes] = splitScopeIdents(baseSegment);
	return {
		kind: 'compound',
		tag: tag!,
		classes,
		nth,
	};
}

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
function matchesScopeSelector(node: ScopedNode, segments: readonly ScopeSegment[]): boolean {
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
function matchesSegment(node: ScopedNode, segment: ScopeSegment): boolean {
	if (segment === null) {
		return false;
	}

	if (segment.kind === 'id') {
		return segment.id.length > 0 && node.id === segment.id;
	}

	if (segment.kind === 'attr') {
		if (node.localName !== segment.tag) {
			return false;
		}
		for (const attr of node.attributes) {
			if (attr.name === segment.attrName && attr.value === segment.attrValue) {
				return true;
			}
		}
		return false;
	}

	const tagMatches = node.localName === segment.tag && segment.classes.every(cls => node.classList.contains(cls));

	if (!tagMatches) {
		return false;
	}

	// Check nth-of-type position
	if (segment.nth !== null) {
		const expectedPosition = segment.nth;
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

	// The scope is read once, not once per violation.
	// It is split at ` > ` without looking at escapes: `serializeIdentifier` writes every `>` of a name as `\>`
	// (and a space as `\ `), so the only ` > ` of a scope is a separator.
	const segments =
		entry.scope && nodeList ? entry.scope.split(' > ').map(segment => parseSegment(segment)) : undefined;

	for (const [i, violation] of violations.entries()) {
		const v = violation;
		if (v.severity !== 'error' || v.ruleId !== ruleId) {
			continue;
		}
		if (segments && nodeList) {
			if (isViolationInScope(nodeList, v, segments)) {
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
