import { unifiedDiff } from '@markuplint/cli-utils';

/**
 * Outputs a unified diff showing what --fix would change.
 * Writes the diff to stdout if there are differences.
 *
 * @param filePath - File path for the diff header
 * @param original - Original source code
 * @param fixed - Fixed source code after applying fixes
 */
export function outputDryRunDiff(filePath: string, original: string, fixed: string): void {
	const diff = unifiedDiff(filePath, original, fixed);
	if (diff) {
		process.stdout.write(diff + '\n');
	}
}
