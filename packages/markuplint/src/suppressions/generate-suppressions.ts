import type { Violation } from '@markuplint/ml-config';

import type { PositionedNode } from './compute-scope.js';
import type { SuppressionsData } from './types.js';

import { computeScopeForViolations } from './compute-scope.js';
import { toRelativePath } from './suppressions-file.js';

/**
 * @experimental
 * Options for suppressions generation.
 */
export type GenerateSuppressionsOptions = {
	/** If provided, only count violations for this specific ruleId. */
	readonly filterRule?: string;
	/**
	 * Map of absolute file paths to their document node lists.
	 * When provided, scope selectors are computed via LCA.
	 * When absent, file-level suppressions are generated (Phase 1 compatible).
	 */

	readonly nodeLists?: ReadonlyMap<string, readonly PositionedNode[]>;
};

/**
 * @experimental
 * Generates suppressions data from collected violations.
 * Only error-severity violations are counted.
 *
 * When `options.nodeLists` is provided, computes a scope selector for each
 * rule's violations via LCA (Lowest Common Ancestor). Otherwise, generates
 * file-level suppressions (Phase 1 compatible).
 *
 * @param violationsByFile - Map of absolute file paths to their violations.
 * @param suppressionsFilePath - Absolute path to the suppressions file (used for relative path calculation).
 * @param options - Optional generation options.
 * @returns The generated suppressions data.
 */
export function generateSuppressions(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	violationsByFile: ReadonlyMap<string, readonly Violation[]>,
	suppressionsFilePath: string,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	options?: GenerateSuppressionsOptions,
): SuppressionsData {
	const filterRule = options?.filterRule;
	const nodeLists = options?.nodeLists;
	const data: SuppressionsData = {};

	for (const [absolutePath, violations] of violationsByFile) {
		// Group error violations by ruleId
		const byRule = new Map<string, Violation[]>();
		for (const v of violations) {
			if (v.severity !== 'error') {
				continue;
			}
			if (filterRule && v.ruleId !== filterRule) {
				continue;
			}
			const list = byRule.get(v.ruleId);
			if (list) {
				list.push(v);
			} else {
				byRule.set(v.ruleId, [v]);
			}
		}

		if (byRule.size > 0) {
			const relPath = toRelativePath(absolutePath, suppressionsFilePath);
			const nodeList = nodeLists?.get(absolutePath);
			const rules: Record<string, { count: number; scope?: string }> = {};

			for (const [ruleId, ruleViolations] of byRule) {
				const scope = nodeList ? computeScopeForViolations(nodeList, ruleViolations) : undefined;
				rules[ruleId] = scope ? { count: ruleViolations.length, scope } : { count: ruleViolations.length };
			}

			data[relPath] = rules;
		}
	}

	return data;
}
