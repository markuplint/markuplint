import type { Violation } from '@markuplint/ml-config';

import type { PositionedNode } from './compute-scope.js';
import type { SuppressionEntry, SuppressionsData } from './types.js';

import { toRelativePath } from './suppressions-file.js';

/**
 * @experimental
 * A violation with its severity potentially downgraded by bulk suppression.
 */
export type DowngradedViolation = Violation & {
	/**
	 * When set, indicates the original severity before suppression downgrade.
	 * Absent when the violation was not affected by suppression.
	 */
	readonly originalSeverity?: Violation['severity'];
};

/**
 * @experimental
 * Result of analyzing violations against suppression data for severity downgrade.
 * Used by editor integrations to show suppressed violations as `info` instead of hiding them.
 */
export type DowngradeResult = {
	/** All violation indices that should be downgraded to info. */
	readonly withinThreshold: ReadonlySet<number>;
	/**
	 * Violation indices where count exceeds the suppressed threshold.
	 * These need further analysis (e.g., git blame) to distinguish old vs new.
	 */
	readonly exceedingThreshold: ReadonlyMap<string, readonly number[]>;
};

/**
 * @experimental
 * Analyzes violations against suppression data and returns which should be downgraded.
 *
 * - Within threshold: all violations for that rule → should be downgraded to info
 * - Exceeding threshold: returns violation indices grouped by ruleId for further analysis
 *
 * @param absoluteFilePath - The file being linted
 * @param violations - The violations to analyze
 * @param suppressions - The suppression data
 * @param suppressionsFilePath - Absolute path to the suppressions file
 * @param nodeList - Optional node list for scope-aware filtering
 */
export function analyzeForDowngrade(
	absoluteFilePath: string,
	violations: readonly Violation[],
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	suppressions: SuppressionsData,
	suppressionsFilePath: string,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	_nodeList?: readonly PositionedNode[],
): DowngradeResult {
	const relPath = toRelativePath(absoluteFilePath, suppressionsFilePath);
	const fileSuppressions = suppressions[relPath];

	if (!fileSuppressions) {
		return { withinThreshold: new Set(), exceedingThreshold: new Map() };
	}

	const withinThreshold = new Set<number>();
	const exceedingThreshold = new Map<string, number[]>();

	// Group error violations by ruleId
	const violationsByRule = new Map<string, { index: number; violation: Violation }[]>();
	for (const [i, v] of violations.entries()) {
		if (v.severity !== 'error') {
			continue;
		}
		const group = violationsByRule.get(v.ruleId) ?? [];
		group.push({ index: i, violation: v });
		violationsByRule.set(v.ruleId, group);
	}

	for (const [ruleId, entry] of Object.entries(fileSuppressions)) {
		const group = violationsByRule.get(ruleId);
		if (!group) {
			continue;
		}

		const scopedGroup = filterByScope(group, entry, _nodeList);
		const scopedCount = scopedGroup.length;

		if (scopedCount === 0) {
			continue;
		}

		if (scopedCount <= entry.count) {
			for (const item of scopedGroup) {
				withinThreshold.add(item.index);
			}
		} else {
			exceedingThreshold.set(
				ruleId,
				scopedGroup.map(item => item.index),
			);
		}
	}

	return { withinThreshold, exceedingThreshold };
}

/**
 * @experimental
 * Applies severity downgrade to violations based on downgrade indices.
 *
 * @param violations - Original violations
 * @param downgradeIndices - Set of violation indices to downgrade to info
 * @returns Violations with severity potentially modified
 */
export function applyDowngrade(
	violations: readonly Violation[],
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	downgradeIndices: ReadonlySet<number>,
): readonly DowngradedViolation[] {
	const result: DowngradedViolation[] = [];
	for (const [i, violation] of violations.entries()) {
		if (downgradeIndices.has(i)) {
			result.push({
				...violation,
				severity: 'info',
				originalSeverity: violation.severity,
			});
		} else {
			result.push(violation);
		}
	}
	return result;
}

function filterByScope(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	group: readonly { index: number; violation: Violation }[],
	entry: Readonly<SuppressionEntry>,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	_nodeList?: readonly PositionedNode[],
): readonly { index: number; violation: Violation }[] {
	if (!entry.scope || !_nodeList) {
		return group;
	}
	// Scope-aware filtering in editor context:
	// When scope is present but we lack full scope matching infrastructure,
	// fall back to file-level filtering (treats all violations as in-scope).
	// This is the safe direction — more violations may be downgraded than intended,
	// but no new violations are hidden.
	// TODO(#3536): Export isViolationInScope from apply-suppressions.ts and reuse here.
	return group;
}
