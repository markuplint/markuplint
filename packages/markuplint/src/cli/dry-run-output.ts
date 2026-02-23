/**
 * Outputs a unified-style diff showing what --fix would change.
 * Uses ANSI colors when stdout supports them.
 */
export function outputDryRunDiff(filePath: string, original: string, fixed: string): void {
	const originalLines = original.split('\n');
	const fixedLines = fixed.split('\n');

	const useColor = process.stdout.isTTY !== false;
	const red = useColor ? '\u001B[31m' : '';
	const green = useColor ? '\u001B[32m' : '';
	const cyan = useColor ? '\u001B[36m' : '';
	const reset = useColor ? '\u001B[0m' : '';

	const edits = computeLineEdits(originalLines, fixedLines);

	const lines: string[] = [`${red}--- a/${filePath}${reset}`, `${green}+++ b/${filePath}${reset}`];

	const CONTEXT = 3;
	const hunks = groupIntoHunks(edits, CONTEXT);

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
					hunkLines.push(`${red}-${edit.line}${reset}`);
					origCount++;
					break;
				}
				case 'insert': {
					hunkLines.push(`${green}+${edit.line}${reset}`);
					fixCount++;
					break;
				}
			}
		}

		lines.push(
			`${cyan}@@ -${hunk.origStart + 1},${origCount} +${hunk.fixStart + 1},${fixCount} @@${reset}`,
			...hunkLines,
		);
	}

	process.stdout.write(lines.join('\n') + '\n');
}

type LineEdit = { readonly type: 'equal' | 'delete' | 'insert'; readonly line: string };

type Hunk = {
	readonly origStart: number;
	readonly fixStart: number;
	readonly edits: readonly LineEdit[];
};

function computeLineEdits(a: readonly string[], b: readonly string[]): LineEdit[] {
	const n = a.length;
	const m = b.length;

	// Build LCS table — dp[i][j] = LCS length of a[0..i-1] and b[0..j-1]
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

	// Backtrack to produce edit script
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
