import c from 'picocolors';

/**
 * Generates a unified-style diff string between two texts.
 * Uses ANSI colors via picocolors when color output is supported.
 *
 * @param filePath - File path for the diff header
 * @param original - Original text
 * @param fixed - Fixed text
 * @returns Formatted unified diff string
 */
export function unifiedDiff(filePath: string, original: string, fixed: string): string {
	const originalLines = original.split('\n');
	const fixedLines = fixed.split('\n');

	const edits = computeLineEdits(originalLines, fixedLines);

	const CONTEXT = 3;
	const hunks = groupIntoHunks(edits, CONTEXT);

	if (hunks.length === 0) {
		return '';
	}

	const lines: string[] = [c.red(`--- a/${filePath}`), c.green(`+++ b/${filePath}`)];

	for (const hunk of hunks) {
		let origCount = 0;
		let fixCount = 0;
		const hunkLines: string[] = [];

		for (const edit of hunk.edits) {
			switch (edit.type) {
				case 'equal': {
					hunkLines.push(` ${edit.line}`);
					origCount++;
					fixCount++;
					break;
				}
				case 'delete': {
					hunkLines.push(c.red(`-${edit.line}`));
					origCount++;
					break;
				}
				case 'insert': {
					hunkLines.push(c.green(`+${edit.line}`));
					fixCount++;
					break;
				}
			}
		}

		lines.push(c.cyan(`@@ -${hunk.origStart + 1},${origCount} +${hunk.fixStart + 1},${fixCount} @@`), ...hunkLines);
	}

	return lines.join('\n');
}

type LineEdit = { readonly type: 'equal' | 'delete' | 'insert'; readonly line: string };

type Hunk = {
	readonly origStart: number;
	readonly fixStart: number;
	readonly edits: readonly LineEdit[];
};

// O(n*m) LCS — acceptable for typical HTML files; consider Myers' algorithm if performance issues arise.
function computeLineEdits(a: readonly string[], b: readonly string[]): LineEdit[] {
	const n = a.length;
	const m = b.length;

	// Invariant: dp[i][j] = LCS length of a[0..i-1] and b[0..j-1]
	const dp: number[][] = [];
	for (let i = 0; i <= n; i++) {
		const row: number[] = [];
		for (let j = 0; j <= m; j++) {
			row.push(0);
		}
		dp.push(row);
	}

	for (let i = 1; i <= n; i++) {
		for (let j = 1; j <= m; j++) {
			if (a[i - 1] === b[j - 1]) {
				dp[i]![j] = dp[i - 1]![j - 1]! + 1;
			} else {
				dp[i]![j] = Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
			}
		}
	}

	const edits: LineEdit[] = [];
	let i = n;
	let j = m;
	while (i > 0 || j > 0) {
		if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
			edits.push({ type: 'equal', line: a[i - 1]! });
			i--;
			j--;
		} else if (j > 0 && (i === 0 || dp[i]![j - 1]! >= dp[i - 1]![j]!)) {
			edits.push({ type: 'insert', line: b[j - 1]! });
			j--;
		} else {
			edits.push({ type: 'delete', line: a[i - 1]! });
			i--;
		}
	}

	edits.reverse();
	return edits;
}

function groupIntoHunks(edits: readonly LineEdit[], context: number): Hunk[] {
	const changedIndices: number[] = [];
	for (const [i, edit] of edits.entries()) {
		if (edit.type !== 'equal') {
			changedIndices.push(i);
		}
	}

	if (changedIndices.length === 0) {
		return [];
	}

	const firstIdx = changedIndices[0]!;
	const hunks: Hunk[] = [];
	let rangeStart = Math.max(0, firstIdx - context);
	let rangeEnd = Math.min(edits.length - 1, firstIdx + context);

	for (let k = 1; k < changedIndices.length; k++) {
		const idx = changedIndices[k]!;
		const newStart = Math.max(0, idx - context);
		const newEnd = Math.min(edits.length - 1, idx + context);

		if (newStart <= rangeEnd + 1) {
			rangeEnd = newEnd;
		} else {
			hunks.push(buildHunk(edits, rangeStart, rangeEnd));
			rangeStart = newStart;
			rangeEnd = newEnd;
		}
	}

	hunks.push(buildHunk(edits, rangeStart, rangeEnd));
	return hunks;
}

function buildHunk(edits: readonly LineEdit[], start: number, end: number): Hunk {
	let origLine = 0;
	let fixLine = 0;
	for (let i = 0; i < start; i++) {
		const edit = edits[i];
		if (!edit) {
			continue;
		}
		if (edit.type === 'equal' || edit.type === 'delete') {
			origLine++;
		}
		if (edit.type === 'equal' || edit.type === 'insert') {
			fixLine++;
		}
	}

	return {
		origStart: origLine,
		fixStart: fixLine,
		edits: edits.slice(start, end + 1),
	};
}
