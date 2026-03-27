import type { Violation } from '@markuplint/ml-config';

import type { SuppressionsData } from './types.js';

import { toRelativePath } from './suppressions-file.js';

/**
 * @experimental
 * Prunes stale entries from suppressions data based on current violations.
 *
 * - Entries with 0 current violations are removed entirely.
 * - Entries with current count < suppressed count are updated to the current count.
 * - Entries with current count >= suppressed count are kept as-is.
 * - Empty file entries (all rules removed) are removed from the top-level.
 *
 * **Note:** Pruning counts all file-level violations, not scope-filtered ones.
 * This is because `pruneSuppressions` does not receive document node lists
 * (required for scope-based violation filtering). For scope-accurate counts,
 * re-run `--suppress` which recomputes both scope and count from the DOM tree.
 *
 * @param currentViolations - Map of absolute file paths to current violations.
 * @param existing - The current suppressions data.
 * @param suppressionsFilePath - Absolute path to the suppressions file.
 * @returns The pruned suppressions data.
 */
export function pruneSuppressions(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	currentViolations: ReadonlyMap<string, readonly Violation[]>,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	existing: SuppressionsData,
	suppressionsFilePath: string,
): SuppressionsData {
	// Build a lookup: relPath → ruleId → error count
	const currentCounts = new Map<string, Map<string, number>>();
	for (const [absolutePath, violations] of currentViolations) {
		const relPath = toRelativePath(absolutePath, suppressionsFilePath);
		const ruleCounts = new Map<string, number>();
		for (const v of violations) {
			if (v.severity === 'error') {
				ruleCounts.set(v.ruleId, (ruleCounts.get(v.ruleId) ?? 0) + 1);
			}
		}
		currentCounts.set(relPath, ruleCounts);
	}

	const pruned: SuppressionsData = {};

	for (const [filePath, rules] of Object.entries(existing)) {
		const fileCounts = currentCounts.get(filePath);
		const prunedRules: Record<string, { count: number; scope?: string }> = {};

		for (const [ruleId, entry] of Object.entries(rules)) {
			const currentCount = fileCounts?.get(ruleId) ?? 0;

			if (currentCount === 0) {
				// No more violations, remove entry
				continue;
			}

			if (currentCount < entry.count) {
				// Reduced violations, update count; preserve scope if present
				prunedRules[ruleId] = entry.scope
					? { count: currentCount, scope: entry.scope }
					: { count: currentCount };
			} else {
				// Same or more violations, keep as-is (including scope)
				prunedRules[ruleId] = entry;
			}
		}

		if (Object.keys(prunedRules).length > 0) {
			pruned[filePath] = prunedRules;
		}
	}

	return pruned;
}
