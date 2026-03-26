import type { Violation } from '@markuplint/ml-config';

import type { SuppressionsData } from './types.js';

import { toRelativePath } from './suppressions-file.js';

/**
 * @experimental
 * Generates suppressions data from collected violations.
 * Only error-severity violations are counted.
 *
 * @param violationsByFile - Map of absolute file paths to their violations.
 * @param suppressionsFilePath - Absolute path to the suppressions file (used for relative path calculation).
 * @param filterRule - If provided, only count violations for this specific ruleId.
 * @returns The generated suppressions data.
 */
export function generateSuppressions(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	violationsByFile: ReadonlyMap<string, readonly Violation[]>,
	suppressionsFilePath: string,
	filterRule?: string,
): SuppressionsData {
	const data: SuppressionsData = {};

	for (const [absolutePath, violations] of violationsByFile) {
		const counts: Record<string, number> = {};

		for (const v of violations) {
			if (v.severity !== 'error') {
				continue;
			}
			if (filterRule && v.ruleId !== filterRule) {
				continue;
			}
			counts[v.ruleId] = (counts[v.ruleId] ?? 0) + 1;
		}

		if (Object.keys(counts).length > 0) {
			const relPath = toRelativePath(absolutePath, suppressionsFilePath);
			const rules: Record<string, { count: number }> = {};
			for (const [ruleId, count] of Object.entries(counts)) {
				rules[ruleId] = { count };
			}
			data[relPath] = rules;
		}
	}

	return data;
}
