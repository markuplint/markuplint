import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { isCliEntry } from './is-cli-entry.ts';
import { SPEC_PATH } from './paths.ts';

const SPEC_CONTENT = `// Generated from ../snapshots/diff/coverage.json by bench/generate-spec.ts.
// DO NOT EDIT. Run 'yarn bench:generate-spec' to regenerate.
import { describe, test } from 'vitest';

import { verifyEntry } from '../bench/verify.ts';
import type { CoverageEntry } from '../bench/types.ts';

import coverage from '../snapshots/diff/coverage.json' with { type: 'json' };

const entries = coverage.entries as readonly CoverageEntry[];

const byCategory = new Map<string, CoverageEntry[]>();
for (const entry of entries) {
\tconst list = byCategory.get(entry.category) ?? [];
\tlist.push(entry);
\tbyCategory.set(entry.category, list);
}

describe('nu-validator benchmark', () => {
\tfor (const [category, categoryEntries] of byCategory) {
\t\tdescribe(category, () => {
\t\t\tfor (const entry of categoryEntries) {
\t\t\t\ttest(entry.path, async () => {
\t\t\t\t\tawait verifyEntry(entry.path);
\t\t\t\t});
\t\t\t}
\t\t});
\t}
});
`;

export async function generateSpec(): Promise<void> {
	await mkdir(dirname(SPEC_PATH), { recursive: true });
	await writeFile(SPEC_PATH, SPEC_CONTENT, 'utf8');
	console.log('[generate-spec] wrote', SPEC_PATH);
}

if (isCliEntry(import.meta.url)) {
	generateSpec().catch(err => {
		console.error(err);
		process.exit(1);
	});
}
