import type { SuppressionsData } from './types.js';

/**
 * @experimental
 * Merges incoming suppressions into existing suppressions.
 * For overlapping entries, takes the maximum count.
 *
 * @param existing - The current suppressions data.
 * @param incoming - The new suppressions data to merge.
 * @returns The merged suppressions data.
 */
// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
export function mergeSuppressions(existing: SuppressionsData, incoming: SuppressionsData): SuppressionsData {
	// Uses max(count) to ensure running --suppress multiple times is idempotent
	// and never accidentally lowers a suppression threshold. Counts are only
	// reduced explicitly via --prune-suppressions.
	const merged: SuppressionsData = {};

	// Collect all file paths
	const allFiles = new Set([...Object.keys(existing), ...Object.keys(incoming)]);

	for (const filePath of allFiles) {
		const existingRules = existing[filePath] ?? {};
		const incomingRules = incoming[filePath] ?? {};

		const allRules = new Set([...Object.keys(existingRules), ...Object.keys(incomingRules)]);
		const mergedRules: Record<string, { count: number }> = {};

		for (const ruleId of allRules) {
			const existingCount = existingRules[ruleId]?.count ?? 0;
			const incomingCount = incomingRules[ruleId]?.count ?? 0;
			mergedRules[ruleId] = { count: Math.max(existingCount, incomingCount) };
		}

		merged[filePath] = mergedRules;
	}

	return merged;
}
