import type { SuppressionEntry, SuppressionsData } from './types.js';

/**
 * @experimental
 * Merges incoming suppressions into existing suppressions.
 * For overlapping entries with the same scope, takes the maximum count;
 * for overlapping entries whose scopes differ, takes the incoming entry.
 *
 * The scope of an overlapping entry is always the incoming one:
 * `generateSuppressions` computes it as the subtree that contains every current
 * violation of the rule, so an existing scope could leave some of them outside
 * and unsuppressed. An incoming entry without a scope covers the whole file, so
 * it drops the existing scope. A count is the number of violations inside its
 * own scope, so when the scope changes, the existing count is not carried over:
 * it would let new violations inside the new scope pass up to a number that
 * scope never held. An entry only on one side is kept as it is, scope included
 * (a rule `--suppress-rule` did not select, a file not linted).
 *
 * @param existing - The current suppressions data.
 * @param incoming - The new suppressions data to merge.
 * @returns The merged suppressions data.
 */
// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
export function mergeSuppressions(existing: SuppressionsData, incoming: SuppressionsData): SuppressionsData {
	// Under the same scope, uses max(count) to ensure running --suppress multiple
	// times is idempotent and never accidentally lowers a suppression threshold.
	// Counts of an unchanged scope are only reduced explicitly via --prune-suppressions.
	const merged: SuppressionsData = {};

	// Collect all file paths
	const allFiles = new Set([...Object.keys(existing), ...Object.keys(incoming)]);

	for (const filePath of allFiles) {
		const existingRules = existing[filePath] ?? {};
		const incomingRules = incoming[filePath] ?? {};

		const allRules = new Set([...Object.keys(existingRules), ...Object.keys(incomingRules)]);
		const mergedRules: Record<string, SuppressionEntry> = {};

		for (const ruleId of allRules) {
			const existingEntry = existingRules[ruleId];
			const incomingEntry = incomingRules[ruleId];
			mergedRules[ruleId] = mergeEntry(existingEntry, incomingEntry);
		}

		merged[filePath] = mergedRules;
	}

	return merged;
}

function mergeEntry(existing: SuppressionEntry | undefined, incoming: SuppressionEntry | undefined): SuppressionEntry {
	// Both are never absent: the rule ID comes from one of the two sides.
	const base = incoming ?? existing!;
	const count =
		existing && incoming && existing.scope === incoming.scope
			? Math.max(existing.count, incoming.count)
			: base.count;
	// Only `count` and `scope` are written: a key the file has besides them is not carried over.
	return base.scope === undefined ? { count } : { count, scope: base.scope };
}
