import type { Violation } from '@markuplint/ml-config';

import type { SuppressionsData } from './types.js';

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
 * Applies suppressions to collected violations.
 *
 * For each file+ruleId pair:
 * - If current error count <= suppressed count: all error violations for that rule are removed.
 * - If current error count > suppressed count: ALL violations are kept (reported).
 *
 * Warning and info violations always pass through unmodified.
 *
 * @param violationsByFile - Map of absolute file paths to violations.
 * @param suppressions - The loaded suppressions data.
 * @param suppressionsFilePath - Absolute path to the suppressions file.
 * @returns Filtered violations and a list of unused suppression entries.
 */

export function applySuppressions(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	violationsByFile: ReadonlyMap<string, readonly Violation[]>,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	suppressions: SuppressionsData,
	suppressionsFilePath: string,
): ApplySuppressionsResult {
	const filtered = new Map<string, Violation[]>();
	const usedEntries = new Set<string>();

	for (const [absolutePath, violations] of violationsByFile) {
		const relPath = toRelativePath(absolutePath, suppressionsFilePath);
		const fileSuppressions = suppressions[relPath];

		if (!fileSuppressions) {
			// No suppressions for this file, pass all through
			filtered.set(absolutePath, [...violations]);
			continue;
		}

		// Count error violations per ruleId
		const errorCounts = new Map<string, number>();
		for (const v of violations) {
			if (v.severity === 'error') {
				errorCounts.set(v.ruleId, (errorCounts.get(v.ruleId) ?? 0) + 1);
			}
		}

		// Determine which rules are suppressed.
		// ESLint-compatible behavior: if current count exceeds the suppressed count,
		// ALL violations are reported (not just the delta). This conservative approach
		// avoids hiding regressions — if violations grew, the user sees the full picture.
		const suppressedRules = new Set<string>();
		for (const [ruleId, entry] of Object.entries(fileSuppressions)) {
			const currentCount = errorCounts.get(ruleId) ?? 0;
			if (currentCount > 0 && currentCount <= entry.count) {
				suppressedRules.add(ruleId);
			}
			if (currentCount > 0) {
				usedEntries.add(`${relPath}:${ruleId}`);
			}
		}

		// Filter violations
		const fileFiltered: Violation[] = [];
		for (const v of violations) {
			if (v.severity === 'error' && suppressedRules.has(v.ruleId)) {
				// Suppressed, skip
				continue;
			}
			fileFiltered.push(v);
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
