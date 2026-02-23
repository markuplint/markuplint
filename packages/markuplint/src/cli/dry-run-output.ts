import { unifiedDiff } from '@markuplint/cli-utils';

/**
 * Outputs a unified diff showing what --fix would change.
 */
export function outputDryRunDiff(filePath: string, original: string, fixed: string): void {
	const diff = unifiedDiff(filePath, original, fixed);
	if (diff) {
		process.stdout.write(diff + '\n');
	}
}
