// Generated from ../snapshots/diff/coverage.json by bench/generate-spec.ts.
// DO NOT EDIT. Run 'yarn bench:generate-spec' to regenerate.
import { describe, test } from 'vitest';

import { verifyEntry } from '../bench/verify.ts';
import type { CoverageEntry } from '../bench/types.ts';

import coverage from '../snapshots/diff/coverage.json' with { type: 'json' };

const entries = coverage.entries as readonly CoverageEntry[];

const byCategory = new Map<string, CoverageEntry[]>();
for (const entry of entries) {
	const list = byCategory.get(entry.category) ?? [];
	list.push(entry);
	byCategory.set(entry.category, list);
}

describe('nu-validator benchmark', () => {
	for (const [category, categoryEntries] of byCategory) {
		describe(category, () => {
			for (const entry of categoryEntries) {
				test(entry.path, async () => {
					await verifyEntry(entry.path);
				});
			}
		});
	}
});
