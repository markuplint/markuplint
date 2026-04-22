import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { mlTest } from 'markuplint';
import { expect } from 'vitest';

import { benchmarkConfig } from './config.ts';
import { readJson } from './fs-utils.ts';
import { ML_SNAPSHOTS_DIR, VALIDATOR_TESTS_DIR } from './paths.ts';
import type { MarkuplintSnapshot, MlViolation } from './types.ts';

function sanitizeMessage(message: string): string {
	return (message.split('\n')[0] ?? message).trim();
}

function toKey(v: MlViolation): string {
	return `${v.line}:${v.col}:${v.ruleId}:${v.message}`;
}

export async function verifyEntry(htmlRelPath: string): Promise<void> {
	const mlPath = join(ML_SNAPSHOTS_DIR, htmlRelPath.replace(/\.html$/, '.json'));
	const stored = await readJson<MarkuplintSnapshot>(mlPath);

	const html = await readFile(join(VALIDATOR_TESTS_DIR, htmlRelPath), 'utf8');
	const { violations } = await mlTest(html, benchmarkConfig);

	const current = [...violations]
		.map<MlViolation>(v => ({
			ruleId: v.ruleId,
			severity: v.severity,
			message: sanitizeMessage(v.message),
			line: v.line,
			col: v.col,
			raw: v.raw,
		}))
		.sort((a, b) => a.line - b.line || a.col - b.col || a.ruleId.localeCompare(b.ruleId) || a.message.localeCompare(b.message));

	const storedKeys = stored.markuplint.violations.map(toKey).sort();
	const currentKeys = current.map(toKey).sort();

	expect(currentKeys, `markuplint output drifted for ${htmlRelPath}; run yarn bench:update:ml to refresh snapshots.`).toEqual(
		storedKeys,
	);
}
