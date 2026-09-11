import { unifiedDiff } from '@markuplint/cli-utils';

export function outputDryRunDiff(filePath: string, original: string, fixed: string): void {
	const diff = unifiedDiff(filePath, original, fixed);
	if (diff) {
		process.stdout.write(diff + '\n');
	}
}
