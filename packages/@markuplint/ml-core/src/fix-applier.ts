import type { FixData, TextEdit } from '@markuplint/ml-config';

/**
 * The result of applying fixes to source code.
 */
export type FixResult = {
	/** The resulting source code after applying fixes */
	readonly output: string;
	/** Fixes that were successfully applied */
	readonly applied: readonly FixData[];
	/** Fixes that were skipped due to overlapping ranges */
	readonly skipped: readonly FixData[];
	/** Flat list of successfully applied edits, sorted by range[0] ascending */
	readonly appliedEdits: readonly TextEdit[];
};

/**
 * Applies a set of text edits to the source code.
 *
 * **Constraint**: Edits within a single FixData must not overlap each other,
 * and should ideally be ordered by range[0]. Inter-FixData overlap is handled
 * by the skip mechanism, but intra-FixData overlap leads to undefined behavior.
 *
 * Algorithm (modeled after ESLint's SourceCodeFixer):
 * 1. Flatten all FixData.edits into individual edits, each tagged with its parent FixData
 * 2. Sort by range[0] ascending (ties broken by range[1] descending)
 * 3. Apply edits sequentially; skip any edit whose range overlaps a previously applied edit
 * 4. Classify each FixData as applied (all edits applied) or skipped (any edit skipped)
 *
 * @param sourceCode - The original source code
 * @param fixes - The fix data to apply
 * @returns The result containing the fixed code and applied/skipped classification
 */
export function applyFixes(sourceCode: string, fixes: readonly FixData[]): FixResult {
	if (fixes.length === 0) {
		return { output: sourceCode, applied: [], skipped: [], appliedEdits: [] };
	}

	const taggedEdits: { readonly edit: TextEdit; readonly fixIndex: number }[] = [];
	for (const [i, fix] of fixes.entries()) {
		for (const edit of fix.edits) {
			taggedEdits.push({ edit, fixIndex: i });
		}
	}

	// Ties broken by range[1] descending so larger ranges come first at the same start.
	taggedEdits.sort((a, b) => {
		const startDiff = a.edit.range[0] - b.edit.range[0];
		// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
		return startDiff || b.edit.range[1] - a.edit.range[1];
	});

	const skippedFixIndices = new Set<number>();
	const appliedEdits: TextEdit[] = [];
	let lastAppliedEnd = -1;
	const parts: string[] = [];
	let cursor = 0;

	for (const { edit, fixIndex } of taggedEdits) {
		const [start, end] = edit.range;

		// Edits within a single FixData are atomic (all-or-nothing): if any sibling
		// was skipped, skip the rest.
		if (start < lastAppliedEnd || skippedFixIndices.has(fixIndex)) {
			skippedFixIndices.add(fixIndex);
			continue;
		}

		parts.push(sourceCode.slice(cursor, start), edit.text);
		appliedEdits.push(edit);

		cursor = end;
		lastAppliedEnd = end;
	}

	parts.push(sourceCode.slice(cursor));

	const applied: FixData[] = [];
	const skipped: FixData[] = [];
	for (const [i, fix] of fixes.entries()) {
		if (skippedFixIndices.has(i)) {
			skipped.push(fix);
		} else {
			applied.push(fix);
		}
	}

	return {
		output: parts.join(''),
		applied,
		skipped,
		appliedEdits,
	};
}
